/**
 * EldenTome — Main JavaScript
 * Tab system, boss detail tabs, scroll effects, auth, community, comments, feedback
 */

// ========== TAB SYSTEM ==========
function switchTab(tabName) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('panel-' + tabName);
    if (panel) panel.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.tab === tabName) link.classList.add('active');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const navLinks = document.getElementById('navLinks');
    if (navLinks) navLinks.classList.remove('open');

    // Load comments when switching to relevant tabs
    if (tabName === 'boss-detail') loadComments('bossDetail');
    if (tabName === 'builds') loadComments('builds');
    if (tabName === 'community-guides') loadCommunityGuides();
}

// Nav link clicks
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.dataset.tab;
        if (tab) switchTab(tab);
    });
});

// ========== BOSS DETAIL TABS ==========
document.querySelectorAll('.boss-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.boss-detail-content').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.boss-tab-btn').forEach(b => b.classList.remove('active'));
        const targetId = btn.dataset.bosstab;
        const target = document.getElementById(targetId);
        if (target) target.classList.add('active');
        btn.classList.add('active');
    });
});

// ========== MOBILE NAV TOGGLE ==========
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
if (navToggle) {
    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');
    });
}
document.addEventListener('click', (e) => {
    if (navLinks && navLinks.classList.contains('open')) {
        if (!navLinks.contains(e.target) && !navToggle.contains(e.target)) {
            navLinks.classList.remove('open');
        }
    }
});

// ========== NAVBAR SCROLL EFFECT ==========
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ========== NEWSLETTER ==========
function handleNewsletter(e) {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    if (email) {
        alert('Thank you, Tarnished! We\'ll send guides to ' + email);
        e.target.reset();
    }
}

// ========== SCROLL ANIMATIONS ==========
const observerOptions = { threshold: 0.05, rootMargin: '0px 0px -30px 0px' };
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);
document.querySelectorAll('.nav-card, .class-card, .timeline-content, .mechanic-card, .build-detail-card, .step-content, .stat-card, .affinity-card, .aow-item, .cheat-item, .boss-detail-section').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
});

// ========== HERO VIDEO FALLBACK + PARTICLES ==========
(function() {
    const hero = document.getElementById('heroSection');
    const video = hero ? hero.querySelector('.hero-video') : null;
    if (!video || !video.querySelector('source')) {
        if (hero) hero.classList.add('no-video');
        return;
    }
    video.addEventListener('canplay', () => { if (hero) hero.classList.remove('no-video'); });
    video.addEventListener('error', () => { if (hero) hero.classList.add('no-video'); });
    const particlesContainer = document.getElementById('heroParticles');
    if (particlesContainer) {
        for (let i = 0; i < 30; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.animationDuration = (6 + Math.random() * 10) + 's';
            p.style.animationDelay = (Math.random() * 8) + 's';
            p.style.width = (1 + Math.random() * 2) + 'px';
            p.style.height = p.style.width;
            particlesContainer.appendChild(p);
        }
    }
})();

// ========== FILTER BUTTONS ==========
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// ============================================================
// AUTH SYSTEM
// ============================================================
let currentUser = null;

function updateAuthUI() {
    const container = document.getElementById('navAuth');
    if (!container) return;

    // Check local session first
    const session = localStorage.getItem('et_session');
    if (session) {
        currentUser = JSON.parse(session);
    } else if (firebaseReady && authInstance) {
        // Firebase auth state listener
        authInstance.onAuthStateChanged(user => {
            if (user) {
                currentUser = { email: user.email, nickname: user.displayName || user.email.split('@')[0] };
                localStorage.setItem('et_session', JSON.stringify(currentUser));
                updateAuthUI();
            } else {
                currentUser = null;
                localStorage.removeItem('et_session');
                updateAuthUI();
            }
        });
        return;
    }

    if (currentUser) {
        const initials = currentUser.nickname.substring(0, 2).toUpperCase();
        container.innerHTML = `
            <li class="nav-user">
                <button class="nav-user-btn" onclick="toggleUserDropdown()">
                    <span class="user-avatar">${initials}</span>
                    <span>${escapeHtml(currentUser.nickname)}</span>
                    <span style="font-size:0.6rem;">▼</span>
                </button>
                <div class="user-dropdown" id="userDropdown">
                    <a href="#" onclick="switchTab('community-guides');closeDropdown();return false;">My Guides</a>
                    <a href="#" onclick="openSubmitGuideModal();closeDropdown();return false;">Submit Guide</a>
                    <div class="dropdown-divider"></div>
                    <a href="#" class="logout" onclick="handleLogout();return false;">Sign Out</a>
                </div>
            </li>`;
        document.getElementById('submitGuideBtn').style.display = 'inline-flex';
        document.getElementById('loginGuideBtn').style.display = 'none';
        updateCommentForms();
    } else {
        container.innerHTML = `
            <li>
                <button class="btn btn-sm" onclick="openLoginModal()" style="padding:8px 16px;font-size:0.7rem;">Sign In</button>
            </li>`;
        document.getElementById('submitGuideBtn').style.display = 'none';
        document.getElementById('loginGuideBtn').style.display = 'inline-flex';
        updateCommentForms();
    }
}

function toggleUserDropdown() {
    const dd = document.getElementById('userDropdown');
    if (dd) dd.classList.toggle('open');
}
function closeDropdown() {
    const dd = document.getElementById('userDropdown');
    if (dd) dd.classList.remove('open');
}
// Close dropdown on outside click
document.addEventListener('click', (e) => {
    const dd = document.getElementById('userDropdown');
    if (dd && !e.target.closest('.nav-user')) {
        dd.classList.remove('open');
    }
});

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errEl = document.getElementById('loginError');
    errEl.textContent = '';

    DB.signIn(email, password).then(user => {
        currentUser = typeof user === 'object' && user.email ?
            { email: user.email, nickname: user.nickname || user.email.split('@')[0] } :
            { email, nickname: localStorage.getItem('et_session') ? JSON.parse(localStorage.getItem('et_session')).nickname : email.split('@')[0] };
        localStorage.setItem('et_session', JSON.stringify(currentUser));
        closeModal('loginModal');
        updateAuthUI();
        showNotification('Welcome back, ' + currentUser.nickname + '!');
    }).catch(err => {
        errEl.textContent = typeof err === 'string' ? err : 'Invalid email or password.';
    });
}

function handleRegister(e) {
    e.preventDefault();
    const nickname = document.getElementById('regNickname').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const errEl = document.getElementById('regError');
    errEl.textContent = '';

    DB.signUp(email, password, nickname).then(() => {
        currentUser = { email, nickname };
        localStorage.setItem('et_session', JSON.stringify(currentUser));
        closeModal('registerModal');
        updateAuthUI();
        showNotification('Account created! Welcome, ' + nickname + '!');
    }).catch(err => {
        errEl.textContent = typeof err === 'string' ? err : 'Registration failed. Please try again.';
    });
}

function handleLogout() {
    DB.signOut().then(() => {
        currentUser = null;
        localStorage.removeItem('et_session');
        updateAuthUI();
        showNotification('Signed out successfully.');
    });
}

// ========== MODAL HELPERS ==========
function openLoginModal() { showModals('loginModal'); }
function openRegisterModal() { showModals('registerModal'); }
function openSubmitGuideModal() {
    if (!currentUser) { openLoginModal(); return; }
    showModals('submitGuideModal');
}
function openFeedbackModal() { showModals('feedbackModal'); }

function showModals(...ids) {
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.add('active'); el.style.display = 'flex'; }
    });
}
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('active'); el.style.display = 'none'; }
}
function switchModal(from, to) {
    closeModal(from);
    setTimeout(() => showModals(to), 200);
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            overlay.style.display = 'none';
        }
    });
});

// ========== COMMENTS SYSTEM ==========
function updateCommentForms() {
    const sections = ['bossDetail', 'builds'];
    sections.forEach(ctx => {
        const formEl = document.getElementById('commentForm-' + ctx);
        if (!formEl) return;
        if (currentUser) {
            formEl.innerHTML = `
                <div class="comment-input-row">
                    <textarea id="commentInput-${ctx}" placeholder="Share your thoughts..."></textarea>
                    <button class="comment-submit-btn" onclick="postComment('${ctx}')">Post</button>
                </div>`;
        } else {
            formEl.innerHTML = `<p class="comment-login-prompt"><a href="#" onclick="openLoginModal();return false;">Log in</a> to join the discussion.</p>`;
        }
    });
}

function postComment(contextId) {
    if (!currentUser) { openLoginModal(); return; }
    const input = document.getElementById('commentInput-' + contextId);
    if (!input || !input.value.trim()) return;

    const comment = {
        contextId: contextId,
        author: currentUser.nickname,
        authorEmail: currentUser.email,
        text: input.value.trim(),
        likes: 0
    };

    DB.addComment(comment).then(() => {
        input.value = '';
        loadComments(contextId);
        showNotification('Comment posted!');
    }).catch(err => {
        showNotification('Failed to post comment.');
    });
}

function loadComments(contextId) {
    DB.getComments(contextId).then(comments => {
        const container = document.getElementById(contextId + 'Comments');
        if (!container) return;
        if (!comments.length) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-dim);font-size:0.85rem;padding:20px;">No comments yet. Be the first!</p>';
            return;
        }
        container.innerHTML = comments.map(c => renderComment(c)).join('');
    }).catch(() => {
        // Fallback: use localStorage
        const comments = LocalDB.getCommentsFor(contextId);
        const container = document.getElementById(contextId + 'Comments');
        if (!container) return;
        if (!comments.length) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-dim);font-size:0.85rem;padding:20px;">No comments yet. Be the first!</p>';
            return;
        }
        container.innerHTML = comments.map(c => renderComment(c)).join('');
    });
}

function renderComment(c) {
    const initials = (c.author || 'A').substring(0, 2).toUpperCase();
    const date = c.createdAt ? timeAgo(new Date(c.createdAt)) : 'recently';
    const isOwner = currentUser && (currentUser.email === c.authorEmail || currentUser.nickname === c.author);
    return `
        <div class="comment-item" data-comment-id="${c.id}">
            <div class="comment-header">
                <div class="comment-author">
                    <div class="comment-avatar">${initials}</div>
                    <div>
                        <span class="comment-name">${escapeHtml(c.author)}</span>
                        <span class="comment-date">${date}</span>
                    </div>
                </div>
                ${isOwner ? `<button class="comment-action comment-delete-btn" onclick="deleteComment('${c.contextId}','${c.id}')">Delete</button>` : ''}
            </div>
            <p class="comment-text">${escapeHtml(c.text)}</p>
            <div class="comment-actions">
                <button class="comment-action" onclick="likeComment('${c.contextId}','${c.id}',this)">
                    &#9829; <span>${c.likes || 0}</span>
                </button>
            </div>
        </div>`;
}

function likeComment(contextId, commentId, btn) {
    DB.likeComment(commentId).then(() => {
        btn.classList.add('liked');
        const span = btn.querySelector('span');
        span.textContent = parseInt(span.textContent) + 1;
    });
}

function deleteComment(contextId, commentId) {
    if (!confirm('Delete this comment?')) return;
    DB.deleteComment(commentId).then(() => loadComments(contextId));
}

// ========== COMMUNITY GUIDES ==========
function loadCommunityGuides() {
    DB.getGuides().then(guides => {
        const container = document.getElementById('communityGuidesList');
        if (!container) return;
        if (!guides.length) {
            container.innerHTML = '<div class="empty-state"><p>No community guides yet. Be the first to share your strategy!</p></div>';
            return;
        }
        container.innerHTML = guides.map(g => renderCommunityGuide(g)).join('');
    }).catch(() => {
        const guides = LocalDB.getGuides();
        const container = document.getElementById('communityGuidesList');
        if (!container) return;
        if (!guides.length) {
            container.innerHTML = '<div class="empty-state"><p>No community guides yet. Be the first to share your strategy!</p></div>';
            return;
        }
        container.innerHTML = guides.map(g => renderCommunityGuide(g)).join('');
    });
}

function renderCommunityGuide(g) {
    const initials = (g.author || '?')[0].toUpperCase();
    const date = g.createdAt ? timeAgo(new Date(g.createdAt)) : '';
    const preview = (g.content || '').substring(0, 200);
    return `
        <div class="community-guide-card" data-guide-id="${g.id}">
            <div class="cg-header">
                <span class="cg-title" onclick="toggleGuideFull('${g.id}')">${escapeHtml(g.title)}</span>
                <span class="cg-category ${g.category || 'tips'}">${escapeHtml(g.category || 'tips')}</span>
            </div>
            <div class="cg-author">
                <div class="cg-author-avatar">${initials}</div>
                <span class="cg-author-name">${escapeHtml(g.author)}</span>
                <span class="cg-date">${date}</span>
            </div>
            <div class="cg-preview" id="preview-${g.id}">${escapeHtml(preview)}${g.content.length > 200 ? '...' : ''}</div>
            <div class="cg-full-content" id="full-${g.id}" style="display:none;">${escapeHtml(g.content)}</div>
            ${g.tags ? `<div class="cg-tags">${g.tags.split(',').map(t => `<span class="cg-tag">#${t.trim()}</span>`).join('')}</div>` : ''}
            <div class="cg-footer">
                <button class="cg-like-btn" onclick="likeGuide('${g.id}',this)">&#9829; ${g.likes || 0}</button>
                <span class="cg-comments-link" onclick="loadComments('guide-${g.id}')">&#9816; Comments</span>
            </div>
            <div class="comments-list" id="comments-guide-${g.id}" style="margin-top:16px;display:none;"></div>
        </div>`;
}

function toggleGuideFull(id) {
    const preview = document.getElementById('preview-' + id);
    const full = document.getElementById('full-' + id);
    if (preview && full) {
        if (full.style.display === 'none') {
            preview.style.display = 'none';
            full.style.display = 'block';
        } else {
            preview.style.display = '-webkit-box';
            full.style.display = 'none';
        }
    }
}

function likeGuide(id, btn) {
    DB.likeGuide(id).then(() => {
        const span = btn.querySelector('span');
        span.textContent = parseInt(span.textContent) + 1;
    });
}

function handleSubmitGuide(e) {
    e.preventDefault();
    if (!currentUser) { openLoginModal(); return; }

    const guide = {
        title: document.getElementById('guideTitle').value.trim(),
        category: document.getElementById('guideCategory').value,
        tags: document.getElementById('guideTags').value.trim(),
        content: document.getElementById('guideContent').value.trim(),
        author: currentUser.nickname,
        authorEmail: currentUser.email
    };

    DB.addGuide(guide).then(() => {
        closeModal('submitGuideModal');
        e.target.reset();
        loadCommunityGuides();
        showNotification('Guide published! Thank you for contributing.');
    }).catch(() => {
        document.getElementById('guideError').textContent = 'Failed to publish. Please try again.';
    });
}

// ========== FEEDBACK ==========
function submitFeedback(e) {
    e.preventDefault();

    const name = document.getElementById('fbName')?.value || document.getElementById('fbNameModal')?.value?.trim() || 'Anonymous';
    const email = document.getElementById('fbEmail')?.value?.trim() || '';
    const category = document.getElementById('fbCategory')?.value || 'other';
    const message = document.getElementById('fbMessage')?.value?.trim() || document.getElementById('fbMessageModal')?.value?.trim() || '';

    // Save to DB
    DB.addFeedback({ name, email, category, message });

    // Open mailto
    const subject = encodeURIComponent('[EldenTome Feedback] ' + category);
    const body = encodeURIComponent('From: ' + name + (email ? ' <' + email + '>' : '') + '\n\n' + message);
    window.open('mailto:whcwhcwhc666@gmail.com?subject=' + subject + '&body=' + body);

    // Show success
    const form = e.target;
    form.innerHTML = '<div class="feedback-success"><h3>&#9989; Thank You!</h3><p>Your feedback has been sent. We\'ll respond as soon as possible.</p></div>';

    showNotification('Feedback submitted!');
}

// ========== NOTIFICATION ==========
function showNotification(msg) {
    let notif = document.getElementById('siteNotification');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'siteNotification';
        notif.style.cssText = `
            position:fixed;top:80px;right:24px;z-index:3000;
            background:var(--gold-dark);color:var(--dark);
            padding:12px 24px;border-radius:var(--radius);
            font-size:0.85rem;font-weight:600;
            transform:translateX(120%);transition:transform 0.3s ease;
            box-shadow:0 4px 20px rgba(0,0,0,0.4);`;
        document.body.appendChild(notif);
    }
    notif.textContent = msg;
    requestAnimationFrame(() => { notif.style.transform = 'translateX(0)'; });
    setTimeout(() => {
        notif.style.transform = 'translateX(120%)';
        setTimeout(() => { notif.textContent = ''; }, 300);
    }, 3000);
}

// ========== UTILITY ==========
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
function timeAgo(date) {
    const seconds = Math.floor((Date.now() - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    const days = Math.floor(hours / 24);
    if (days < 30) return days + 'd ago';
    const months = Math.floor(days / 30);
    return months + 'mo ago';
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    loadComments('bossDetail');
    loadComments('builds');
});
