/**
 * EldenTome — Firebase Configuration & Helpers
 *
 * Instructions:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create project "eldentome"
 * 3. Enable Authentication → Email/Password
 * 4. Create Firestore database → start in test mode
 * 5. Project Settings → General → Your apps → Web app
 * 6. Copy config here
 *
 * Without Firebase config, the site works in localStorage "demo mode".
 */

// ============================================================
// Replace these with your Firebase project config
// ============================================================
const FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY",
    authDomain: "eldentome.firebaseapp.com",
    projectId: "eldentome",
    storageBucket: "eldentome.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// ============================================================
// Firebase init (only if config is valid)
// ============================================================
let firebaseReady = false;
let authInstance = null;
let dbInstance = null;

(function initFirebase() {
    // Skip if config is placeholder
    if (FIREBASE_CONFIG.apiKey === "YOUR_API_KEY") {
        console.log('[EldenTome] Running in localStorage demo mode. Configure Firebase for production.');
        return;
    }

    try {
        // Dynamically load Firebase SDKs
        const scripts = [
            'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js'
        ];
        let loadIndex = 0;

        function loadNext() {
            if (loadIndex >= scripts.length) {
                // All loaded
                firebase.initializeApp(FIREBASE_CONFIG);
                authInstance = firebase.auth();
                dbInstance = firebase.firestore();
                firebaseReady = true;

                // Enable offline persistence
                if (dbInstance && dbInstance.enableIndexedDbPersistence) {
                    dbInstance.enableIndexedDbPersistence().catch(() => {});
                }

                console.log('[EldenTome] Firebase initialized successfully.');
                return;
            }
            const s = document.createElement('script');
            s.src = scripts[loadIndex];
            s.onload = () => { loadIndex++; loadNext(); };
            s.onerror = () => { console.warn('[EldenTome] Firebase SDK load failed, using localStorage.'); };
            document.head.appendChild(s);
        }
        loadNext();
    } catch (e) {
        console.warn('[EldenTome] Firebase init failed:', e.message);
    }
})();

// ============================================================
// localStorage fallback data store
// ============================================================
const LocalDB = {
    get(key) {
        try { return JSON.parse(localStorage.getItem('et_' + key)) || []; }
        catch { return []; }
    },
    set(key, data) {
        localStorage.setItem('et_' + key, JSON.stringify(data));
    },
    // User helpers
    getUsers() { return this.get('users'); },
    addUser(user) {
        const users = this.getUsers();
        users.push({ ...user, id: 'u_' + Date.now(), createdAt: new Date().toISOString() });
        this.set('users', users);
    },
    findUser(email) {
        return this.getUsers().find(u => u.email === email);
    },
    deleteUser(userId) {
        this.set('users', this.getUsers().filter(u => u.id !== userId));
    },
    banUser(userId, banned) {
        const users = this.getUsers();
        const u = users.find(x => x.id === userId);
        if (u) u.banned = !!banned;
        this.set('users', users);
    },

    // Guide helpers
    getGuides() { return this.get('guides'); },
    addGuide(guide) {
        const guides = this.getGuides();
        guides.unshift({ ...guide, id: 'g_' + Date.now(), likes: 0, createdAt: new Date().toISOString() });
        this.set('guides', guides);
    },
    deleteGuide(id) {
        this.set('guides', this.getGuides().filter(g => g.id !== id));
    },
    likeGuide(id) {
        const guides = this.getGuides();
        const g = guides.find(x => x.id === id);
        if (g) g.likes = (g.likes || 0) + 1;
        this.set('guides', guides);
    },

    // Comment helpers
    getComments() { return this.get('comments'); },
    addComment(comment) {
        const comments = this.getComments();
        comments.unshift({ ...comment, id: 'c_' + Date.now(), likes: 0, createdAt: new Date().toISOString() });
        this.set('comments', comments);
    },
    deleteComment(id) {
        this.set('comments', this.getComments().filter(c => c.id !== id));
    },
    likeComment(id) {
        const comments = this.getComments();
        const c = comments.find(x => x.id === id);
        if (c) c.likes = (c.likes || 0) + 1;
        this.set('comments', comments);
    },
    getCommentsFor(context) {
        return this.getComments().filter(c => c.contextId === context);
    },

    // Feedback helpers
    getFeedback() { return this.get('feedback'); },
    addFeedback(fb) {
        const list = this.getFeedback();
        list.unshift({ ...fb, id: 'fb_' + Date.now(), resolved: false, createdAt: new Date().toISOString() });
        this.set('feedback', list);
    },
    deleteFeedback(id) {
        this.set('feedback', this.getFeedback().filter(f => f.id !== id));
    },
    markResolved(id) {
        const list = this.getFeedback();
        const f = list.find(x => x.id === id);
        if (f) f.resolved = true;
        this.set('feedback', list);
    }
};

// ============================================================
// Unified API — uses Firebase if available, localStorage fallback
// ============================================================
const DB = {
    // Auth
    getCurrentUser() {
        if (firebaseReady && authInstance) {
            return authInstance.currentUser;
        }
        const session = localStorage.getItem('et_session');
        return session ? JSON.parse(session) : null;
    },
    signUp(email, password, nickname) {
        if (firebaseReady && authInstance) {
            return authInstance.createUserWithEmailAndPassword(email, password)
                .then(cred => {
                    return dbInstance.collection('users').doc(cred.user.uid).set({
                        email, nickname, createdAt: new Date().toISOString()
                    }).then(() => cred.user);
                });
        }
        // Fallback
        if (LocalDB.findUser(email)) return Promise.reject('Email already registered');
        LocalDB.addUser({ email, nickname, password }); // In production, hash passwords!
        localStorage.setItem('et_session', JSON.stringify({ email, nickname }));
        return Promise.resolve({ email, nickname });
    },
    signIn(email, password) {
        if (firebaseReady && authInstance) {
            return authInstance.signInWithEmailAndPassword(email, password)
                .then(cred => cred.user);
        }
        // Fallback
        const user = LocalDB.findUser(email);
        if (!user || user.password !== password) return Promise.reject('Invalid credentials');
        localStorage.setItem('et_session', JSON.stringify({ email: user.email, nickname: user.nickname }));
        return Promise.resolve({ email: user.email, nickname: user.nickname });
    },
    signOut() {
        if (firebaseReady && authInstance) {
            return authInstance.signOut();
        }
        localStorage.removeItem('et_session');
        return Promise.resolve();
    },

    // Guides
    addGuide(guide) {
        if (firebaseReady && dbInstance) {
            return dbInstance.collection('guides').add(guide);
        }
        LocalDB.addGuide(guide);
        return Promise.resolve();
    },
    getGuides() {
        if (firebaseReady && dbInstance) {
            return dbInstance.collection('guides').orderBy('createdAt', 'desc').get();
        }
        return Promise.resolve(LocalDB.getGuides());
    },
    deleteGuide(id) {
        if (firebaseReady && dbInstance) {
            return dbInstance.collection('guides').doc(id).delete();
        }
        LocalDB.deleteGuide(id);
        return Promise.resolve();
    },
    likeGuide(id) {
        if (firebaseReady && dbInstance) {
            return dbInstance.collection('guides').doc(id).update({ likes: firebase.firestore.FieldValue.increment(1) });
        }
        LocalDB.likeGuide(id);
        return Promise.resolve();
    },

    // Comments
    addComment(comment) {
        if (firebaseReady && dbInstance) {
            return dbInstance.collection('comments').add(comment);
        }
        LocalDB.addComment(comment);
        return Promise.resolve();
    },
    getComments(contextId) {
        if (firebaseReady && dbInstance) {
            return dbInstance.collection('comments')
                .where('contextId', '==', contextId)
                .orderBy('createdAt', 'desc')
                .get();
        }
        return Promise.resolve(LocalDB.getCommentsFor(contextId));
    },
    deleteComment(id) {
        if (firebaseReady && dbInstance) {
            return dbInstance.collection('comments').doc(id).delete();
        }
        LocalDB.deleteComment(id);
        return Promise.resolve();
    },
    likeComment(id) {
        if (firebaseReady && dbInstance) {
            return dbInstance.collection('comments').doc(id).update({ likes: firebase.firestore.FieldValue.increment(1) });
        }
        LocalDB.likeComment(id);
        return Promise.resolve();
    },

    // Feedback
    addFeedback(fb) {
        if (firebaseReady && dbInstance) {
            return dbInstance.collection('feedback').add(fb);
        }
        LocalDB.addFeedback(fb);
        return Promise.resolve();
    },
    getFeedback() {
        if (firebaseReady && dbInstance) {
            return dbInstance.collection('feedback').orderBy('createdAt', 'desc').get();
        }
        return Promise.resolve(LocalDB.getFeedback());
    },
    deleteFeedback(id) {
        if (firebaseReady && dbInstance) {
            return dbInstance.collection('feedback').doc(id).delete();
        }
        LocalDB.deleteFeedback(id);
        return Promise.resolve();
    },
    markResolved(id) {
        if (firebaseReady && dbInstance) {
            return dbInstance.collection('feedback').doc(id).update({ resolved: true });
        }
        LocalDB.markResolved(id);
        return Promise.resolve();
    },

    // Admin data
    getAllUsers() {
        if (firebaseReady && dbInstance) {
            return dbInstance.collection('users').get();
        }
        return Promise.resolve(LocalDB.getUsers());
    },
    getAllGuides() {
        return this.getGuides();
    },
    getAllComments() {
        if (firebaseReady && dbInstance) {
            return dbInstance.collection('comments').orderBy('createdAt', 'desc').get();
        }
        return Promise.resolve(LocalDB.getComments());
    },
    getAllFeedback() {
        return Promise.resolve(LocalDB.getFeedback());
    }
};
