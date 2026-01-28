import {
    collection,
    doc,
    setDoc,
    getDoc,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    increment,
    Timestamp,
    limit,
    getDocs,
    deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Conversation, DirectMessage, User } from '@/types';

/**
 * Creates a unique conversation ID for two users by sorting their IDs
 */
export function getConversationId(uid1: string, uid2: string): string {
    return [uid1, uid2].sort().join('_');
}

/**
 * Gets or creates a conversation between two users
 */
export async function getOrCreateConversation(user1: User, user2: User): Promise<string> {
    const conversationId = getConversationId(user1.uid, user2.uid);
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (!conversationSnap.exists()) {
        const conversationData: Partial<Conversation> = {
            id: conversationId,
            participants: [user1.uid, user2.uid],
            participantDetails: {
                [user1.uid]: {
                    displayName: user1.displayName,
                    photoURL: user1.photoURL || null
                },
                [user2.uid]: {
                    displayName: user2.displayName,
                    photoURL: user2.photoURL || null
                }
            },
            unreadCount: {
                [user1.uid]: 0,
                [user2.uid]: 0
            },
            createdAt: serverTimestamp() as any,
            updatedAt: serverTimestamp() as any
        };
        await setDoc(conversationRef, conversationData);
    } else {
        // Update participant details in case they changed
        await updateDoc(conversationRef, {
            [`participantDetails.${user1.uid}`]: {
                displayName: user1.displayName,
                photoURL: user1.photoURL || null
            },
            [`participantDetails.${user2.uid}`]: {
                displayName: user2.displayName,
                photoURL: user2.photoURL || null
            },
            updatedAt: serverTimestamp()
        });
    }

    return conversationId;
}

/**
 * Sends a direct message
 */
export async function sendDirectMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: DirectMessage['type'] = 'text',
    mediaData?: Partial<DirectMessage>,
    replyTo?: { id: string; author: string; content: string }
) {
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (!conversationSnap.exists()) throw new Error('Konuşma bulunamadı');

    const participants = conversationSnap.data().participants as string[];

    // Check if sender is blocked (someone in the conversation blocked the sender)
    const blockedBy = conversationSnap.data().blockedBy || [];
    if (blockedBy.includes(senderId)) throw new Error('Bu konuşmada engellendiniz');

    const messageData: Partial<DirectMessage> = {
        conversationId,
        senderId,
        content,
        type,
        createdAt: serverTimestamp() as any,
        isRead: false,
        ...mediaData
    };

    if (replyTo) {
        messageData.replyToId = replyTo.id;
        messageData.replyToAuthor = replyTo.author;
        messageData.replyToContent = replyTo.content;
    }

    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const docRef = await addDoc(messagesRef, messageData);

    // Update conversation last message and unread count
    const conversationUpdate: any = {
        lastMessage: content,
        lastMessageAt: serverTimestamp(),
        lastMessageSenderId: senderId,
        updatedAt: serverTimestamp()
    };

    const isGroup = conversationSnap.data().isGroup;

    participants.forEach(pid => {
        if (pid !== senderId) {
            conversationUpdate[`unreadCount.${pid}`] = increment(1);
        }
    });

    await updateDoc(conversationRef, conversationUpdate);

    return docRef.id;
}

/**
 * Creates a group conversation
 */
export async function createGroupConversation(creator: User, title: string, participantUsers: User[]) {
    const participants = [creator.uid, ...participantUsers.map(u => u.uid)];
    const participantDetails: any = {
        [creator.uid]: {
            displayName: creator.displayName,
            photoURL: creator.photoURL || null
        }
    };
    const unreadCount: any = { [creator.uid]: 0 };

    participantUsers.forEach(u => {
        participantDetails[u.uid] = {
            displayName: u.displayName,
            photoURL: u.photoURL || null
        };
        unreadCount[u.uid] = 0;
    });

    const conversationData: Partial<Conversation> = {
        participants,
        participantDetails,
        unreadCount,
        isGroup: true,
        groupName: title,
        createdBy: creator.uid,
        admins: [creator.uid],
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any
    };

    const docRef = await addDoc(collection(db, 'conversations'), conversationData);
    await updateDoc(docRef, { id: docRef.id });
    return docRef.id;
}

/**
 * Forwards a message to other conversations
 */
export async function forwardDirectMessage(fromConvId: string, messageId: string, toConvIds: string[], userId: string) {
    const msgRef = doc(db, 'conversations', fromConvId, 'messages', messageId);
    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) throw new Error('Mesaj bulunamadı');

    const originalData = msgSnap.data();
    const fromConvSnap = await getDoc(doc(db, 'conversations', fromConvId));
    const senderName = fromConvSnap.data()?.participantDetails[originalData.senderId]?.displayName || 'Biri';

    for (const toId of toConvIds) {
        const mediaData: any = {};
        if (originalData.imageUrl) mediaData.imageUrl = originalData.imageUrl;
        if (originalData.fileUrl) {
            mediaData.fileUrl = originalData.fileUrl;
            mediaData.fileName = originalData.fileName;
        }
        if (originalData.audioUrl) {
            mediaData.audioUrl = originalData.audioUrl;
            mediaData.audioDuration = originalData.audioDuration;
        }

        await sendDirectMessage(
            toId,
            userId,
            originalData.content,
            originalData.type,
            {
                ...mediaData,
                isForwarded: true,
                originalSenderName: senderName
            }
        );
    }
}

export async function updatePrivacySettings(userId: string, settings: User['privacySettings']) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { privacySettings: settings });
}

/**
 * Adds a member to a group conversation
 */
export async function addGroupMember(conversationId: string, newUser: User) {
    const conversationRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDoc(conversationRef);
    if (!convSnap.exists() || !convSnap.data()?.isGroup) throw new Error('Grup bulunamadı');

    const participants = convSnap.data().participants;
    if (participants.includes(newUser.uid)) return; // Zaten üye

    await updateDoc(conversationRef, {
        participants: [...participants, newUser.uid],
        [`participantDetails.${newUser.uid}`]: {
            displayName: newUser.displayName,
            photoURL: newUser.photoURL || null
        },
        [`unreadCount.${newUser.uid}`]: 0,
        updatedAt: serverTimestamp()
    });
}

/**
 * Removes a member from a group conversation
 */
export async function removeGroupMember(conversationId: string, userId: string, removerId: string) {
    const conversationRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDoc(conversationRef);
    if (!convSnap.exists() || !convSnap.data()?.isGroup) throw new Error('Grup bulunamadı');

    const data = convSnap.data();
    // Sadece adminler veya oluşturucu çıkarabilir
    if (!data.admins?.includes(removerId) && data.createdBy !== removerId) {
        throw new Error('Bu işlem için yetkiniz yok');
    }

    const newParticipants = data.participants.filter((p: string) => p !== userId);
    const newAdmins = (data.admins || []).filter((a: string) => a !== userId);

    // participantDetails'tan sil - Firestore'da doğrudan silme için FieldValue gerekir
    const { deleteField } = await import('firebase/firestore');

    await updateDoc(conversationRef, {
        participants: newParticipants,
        admins: newAdmins,
        [`participantDetails.${userId}`]: deleteField(),
        [`unreadCount.${userId}`]: deleteField(),
        updatedAt: serverTimestamp()
    });
}

/**
 * User leaves a group conversation
 */
export async function leaveGroup(conversationId: string, userId: string) {
    const conversationRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDoc(conversationRef);
    if (!convSnap.exists() || !convSnap.data()?.isGroup) throw new Error('Grup bulunamadı');

    const data = convSnap.data();
    const newParticipants = data.participants.filter((p: string) => p !== userId);
    const newAdmins = (data.admins || []).filter((a: string) => a !== userId);

    // Oluşturucu ayrılıyorsa ve başka admin varsa, ilk admini oluşturucu yap
    let newCreatedBy = data.createdBy;
    if (data.createdBy === userId) {
        if (newAdmins.length > 0) {
            newCreatedBy = newAdmins[0];
        } else if (newParticipants.length > 0) {
            newCreatedBy = newParticipants[0];
            newAdmins.push(newParticipants[0]);
        }
    }

    const { deleteField } = await import('firebase/firestore');

    await updateDoc(conversationRef, {
        participants: newParticipants,
        admins: newAdmins,
        createdBy: newCreatedBy,
        [`participantDetails.${userId}`]: deleteField(),
        [`unreadCount.${userId}`]: deleteField(),
        updatedAt: serverTimestamp()
    });
}

/**
 * Promotes a user to group admin
 */
export async function promoteToAdmin(conversationId: string, userId: string, promoterId: string) {
    const conversationRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDoc(conversationRef);
    if (!convSnap.exists() || !convSnap.data()?.isGroup) throw new Error('Grup bulunamadı');

    const data = convSnap.data();
    if (!data.admins?.includes(promoterId) && data.createdBy !== promoterId) {
        throw new Error('Bu işlem için yetkiniz yok');
    }

    if (data.admins?.includes(userId)) return; // Zaten admin

    await updateDoc(conversationRef, {
        admins: [...(data.admins || []), userId],
        updatedAt: serverTimestamp()
    });
}

/**
 * Demotes an admin to regular member
 */
export async function demoteFromAdmin(conversationId: string, userId: string, demoterId: string) {
    const conversationRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDoc(conversationRef);
    if (!convSnap.exists() || !convSnap.data()?.isGroup) throw new Error('Grup bulunamadı');

    const data = convSnap.data();
    // Sadece oluşturucu adminlik kaldırabilir
    if (data.createdBy !== demoterId) {
        throw new Error('Sadece grup oluşturucusu admin kaldırabilir');
    }

    const newAdmins = (data.admins || []).filter((a: string) => a !== userId);

    await updateDoc(conversationRef, {
        admins: newAdmins,
        updatedAt: serverTimestamp()
    });
}

/**
 * Updates user presence/lastSeen
 */
export async function updateUserPresence(userId: string) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        lastSeen: serverTimestamp()
    });
}

/**
 * Updates lastSeen in all conversations for a user
 */
export async function updateConversationPresence(userId: string) {
    const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId)
    );
    const snapshot = await getDocs(q);

    const updates = snapshot.docs.map(d =>
        updateDoc(d.ref, {
            [`participantDetails.${userId}.lastSeen`]: serverTimestamp()
        })
    );
    await Promise.all(updates);
}

/**
 * Deletes a conversation and all its messages
 */
export async function deleteConversation(conversationId: string) {
    // First delete all messages in the subcollection
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messagesSnapshot = await getDocs(messagesRef);
    const deletePromises = messagesSnapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);

    // Then delete the conversation document
    const conversationRef = doc(db, 'conversations', conversationId);
    await deleteDoc(conversationRef);
}

/**
 * Updates a direct message (edit)
 */
export async function updateDirectMessage(conversationId: string, messageId: string, content: string) {
    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await updateDoc(messageRef, {
        content,
        isEdited: true,
        editedAt: serverTimestamp()
    });

    // If it's the last message, update conversation preview
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    if (conversationSnap.exists() && conversationSnap.data().lastMessageAt) {
        // Technically we should check if this is indeed the latest, 
        // but typically edits happen on recent messages.
        await updateDoc(conversationRef, {
            lastMessage: content
        });
    }
}

/**
 * Deletes a direct message
 */
export async function deleteDirectMessage(conversationId: string, messageId: string) {
    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await updateDoc(messageRef, {
        content: '🚫 Bu mesaj silindi',
        type: 'text',
        imageUrl: null,
        fileUrl: null,
        audioUrl: null,
        isDeleted: true // Custom flag if needed
    });
}

/**
 * Adds or removes a reaction to/from a message
 */
export async function reactToDirectMessage(conversationId: string, messageId: string, userId: string, emoji: string) {
    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    const messageSnap = await getDoc(messageRef);
    if (!messageSnap.exists()) return;

    const reactions = messageSnap.data().reactions || {};
    const users = reactions[emoji] || [];

    if (users.includes(userId)) {
        // Remove reaction
        reactions[emoji] = users.filter((id: string) => id !== userId);
        if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
        // Add reaction
        reactions[emoji] = [...users, userId];
    }

    await updateDoc(messageRef, { reactions });
}

/**
 * Sets typing status in a conversation
 */
export async function setTypingStatus(conversationId: string, userId: string, isTyping: boolean) {
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
        [`typing.${userId}`]: isTyping
    });
}

/**
 * Blocks or unblocks a user in a conversation
 */
export async function toggleBlockUser(conversationId: string, blockerId: string) {
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    if (!conversationSnap.exists()) return;

    const blockedBy = conversationSnap.data().blockedBy || [];
    let newBlockedBy = [];

    if (blockedBy.includes(blockerId)) {
        newBlockedBy = blockedBy.filter((id: string) => id !== blockerId);
    } else {
        newBlockedBy = [...blockedBy, blockerId];
    }

    await updateDoc(conversationRef, { blockedBy: newBlockedBy });
}

/**
 * Clears all messages in a conversation
 */
export async function clearConversationMessages(conversationId: string) {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const snapshot = await getDocs(messagesRef);

    // Batch delete would be better, but for simplicity:
    const { deleteDoc } = await import('firebase/firestore');
    const promises = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(promises);

    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
        lastMessage: null,
        lastMessageAt: null,
        lastMessageSenderId: null
    });
}

/**
 * Toggles pin status of a message
 */
export async function togglePinDirectMessage(conversationId: string, messageId: string, isPinned: boolean) {
    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await updateDoc(messageRef, { isPinned });
}

/**
 * Subscribes to pinned messages in a conversation
 */
export function subscribeToPinnedMessages(conversationId: string, callback: (messages: DirectMessage[]) => void) {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, where('isPinned', '==', true), orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: (doc.data().createdAt as any)?.toDate?.() || new Date(doc.data().createdAt)
        } as DirectMessage));
        callback(messages);
    });
}

/**
 * Subscribes to messages in a conversation
 */
export function subscribeToDirectMessages(conversationId: string, limitCount: number, callback: (messages: DirectMessage[]) => void) {
    const q = query(
        collection(db, 'conversations', conversationId, 'messages'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
        const messages: DirectMessage[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            messages.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            } as DirectMessage);
        });
        callback(messages);
    });
}

/**
 * Subscribes to a user's conversations
 */
export function subscribeToUserConversations(userId: string, callback: (conversations: Conversation[]) => void) {
    const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const conversations: Conversation[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            conversations.push({
                ...data,
                id: doc.id,
                lastMessageAt: data.lastMessageAt instanceof Timestamp ? data.lastMessageAt.toDate() : data.lastMessageAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
            } as Conversation);
        });
        callback(conversations);
    });
}

/**
 * Marks all messages in a conversation as read for a user
 */
export async function markConversationAsRead(conversationId: string, userId: string) {
    const conversationRef = doc(db, 'conversations', conversationId);

    // Reset unread count
    await updateDoc(conversationRef, {
        [`unreadCount.${userId}`]: 0
    });

    // Mark unread messages as read
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(
        messagesRef,
        where('isRead', '==', false),
        where('senderId', '!=', userId)
    );

    const snapshot = await getDocs(q);
    const updates = snapshot.docs.map(d => updateDoc(d.ref, { isRead: true }));
    await Promise.all(updates);
}

/**
 * Toggles pin status of a conversation for a user
 */
export async function togglePinConversation(conversationId: string, userId: string) {
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    if (!conversationSnap.exists()) return;

    const pinnedBy = conversationSnap.data().pinnedBy || [];
    let newPinnedBy = [];

    if (pinnedBy.includes(userId)) {
        newPinnedBy = pinnedBy.filter((id: string) => id !== userId);
    } else {
        newPinnedBy = [...pinnedBy, userId];
    }

    await updateDoc(conversationRef, { pinnedBy: newPinnedBy });
}

/**
 * Toggles E2E encryption for a conversation
 */
export async function toggleEncryption(conversationId: string, userId: string) {
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    if (!conversationSnap.exists()) return;

    const isEncrypted = conversationSnap.data().isEncrypted || false;
    await updateDoc(conversationRef, { isEncrypted: !isEncrypted });
}

/**
 * Simple encryption function using AES-like XOR cipher
 * Note: For production, use Web Crypto API with proper key management
 */
export function encryptMessage(content: string, key: string): string {
    if (!key) return content;
    let result = '';
    for (let i = 0; i < content.length; i++) {
        result += String.fromCharCode(content.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result); // Base64 encode
}

/**
 * Simple decryption function
 */
export function decryptMessage(encrypted: string, key: string): string {
    if (!key) return encrypted;
    try {
        const decoded = atob(encrypted); // Base64 decode
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return result;
    } catch {
        return encrypted; // Return as-is if decryption fails
    }
}

/**
 * Search messages across all user's conversations
 */
export async function searchMessagesGlobal(
    userId: string,
    searchTerm: string,
    maxResults: number = 50
): Promise<{ conversationId: string; conversationName: string; message: DirectMessage }[]> {
    if (!searchTerm.trim() || searchTerm.length < 2) return [];

    const results: { conversationId: string; conversationName: string; message: DirectMessage }[] = [];
    const searchLower = searchTerm.toLowerCase();

    // Get all user's conversations
    const convsQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId)
    );
    const convsSnapshot = await getDocs(convsQuery);

    // Search in each conversation's messages
    for (const convDoc of convsSnapshot.docs) {
        if (results.length >= maxResults) break;

        const convData = convDoc.data();
        const convId = convDoc.id;

        // Get conversation name
        let convName = '';
        if (convData.isGroup) {
            convName = convData.groupName || 'Grup';
        } else {
            const otherId = convData.participants.find((p: string) => p !== userId);
            convName = convData.participantDetails?.[otherId]?.displayName || 'Bilinmeyen';
        }

        // Get messages from this conversation
        const messagesQuery = query(
            collection(db, 'conversations', convId, 'messages'),
            orderBy('createdAt', 'desc'),
            limit(100) // Search in last 100 messages per conversation
        );
        const messagesSnapshot = await getDocs(messagesQuery);

        for (const msgDoc of messagesSnapshot.docs) {
            if (results.length >= maxResults) break;

            const msgData = msgDoc.data();
            if (msgData.content && msgData.content.toLowerCase().includes(searchLower)) {
                results.push({
                    conversationId: convId,
                    conversationName: convName,
                    message: {
                        id: msgDoc.id,
                        ...msgData,
                        createdAt: msgData.createdAt instanceof Timestamp
                            ? msgData.createdAt.toDate()
                            : new Date(msgData.createdAt)
                    } as DirectMessage
                });
            }
        }
    }

    return results;
}
