// 전역 변수
let folders = [];
let posts = [];
let currentFolder = null;
let currentPost = null;
let subscriptions = [];
let currentUser = null;
let githubToken = null;

// GitHub OAuth 설정
const GITHUB_CLIENT_ID = 'your_github_client_id'; // GitHub OAuth App에서 생성 필요
const GITHUB_REDIRECT_URI = window.location.origin + window.location.pathname;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    // GitHub OAuth 콜백 처리
    handleOAuthCallback();
    
    // 저장된 사용자 정보 확인
    const savedUser = localStorage.getItem('githubUser');
    const savedToken = localStorage.getItem('githubToken');
    
    if (savedUser && savedToken) {
        currentUser = JSON.parse(savedUser);
        githubToken = savedToken;
        updateUserInterface();
    }
    
    // 기존 데이터 로드
    loadData();
    
    // 기본 구독 추가
    if (subscriptions.length === 0) {
        subscribeToBlog('https://blog.naver.com/sdedy/223963448085');
    }
    
    // UI 렌더링
    renderFolders();
    renderPosts();
    
    // 이벤트 리스너 설정
    setupEventListeners();
});

// 이벤트 리스너 설정
function setupEventListeners() {
    // 구독 버튼
    const subscribeBtn = document.querySelector('button[onclick="subscribeToBlog()"]');
    if (subscribeBtn) {
        subscribeBtn.addEventListener('click', subscribeToBlog);
    }
    
    // 최신화 버튼
    const refreshBtn = document.querySelector('button[onclick="refreshPosts()"]');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshPosts);
    }
    
    // 새 폴더 버튼
    const addFolderBtn = document.getElementById('addFolderBtn');
    if (addFolderBtn) {
        addFolderBtn.addEventListener('click', addNewFolder);
    }
    
    // 전체 구독 목록 버튼
    const allSubscriptionsBtn = document.getElementById('allSubscriptionsBtn');
    if (allSubscriptionsBtn) {
        allSubscriptionsBtn.addEventListener('click', showAllSubscriptions);
    }
    
    // 메모 저장 버튼
    const saveMemoBtn = document.getElementById('saveMemoBtn');
    if (saveMemoBtn) {
        saveMemoBtn.addEventListener('click', saveMemo);
    }
    
    // 정렬 옵션
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            renderPosts();
        });
    }
    
    // 모달 닫기
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    window.addEventListener('click', function(event) {
        if (event.target === document.getElementById('modal')) {
            closeModal();
        }
    });
}

// 기본 구독 설정
async function initializeDefaultSubscription() {
    const defaultUrl = 'https://blog.naver.com/sdedy/223963448085';
    if (!subscriptions.includes(defaultUrl)) {
        subscriptions.push(defaultUrl);
        saveData();
        // 실제 블로그에서 데이터 가져오기
        await addSamplePosts();
    }
}

// 실제 블로그에서 포스트 가져오기
async function fetchBlogPosts(blogUrl) {
    try {
        // 네이버 블로그 RSS 피드 URL 생성
        const blogId = extractBlogId(blogUrl);
        if (!blogId) {
            throw new Error('블로그 ID를 추출할 수 없습니다.');
        }
        
        // 여러 페이지의 RSS 피드를 가져와서 더 많은 포스트 수집
        const allPosts = [];
        const maxPages = 5; // 최대 5페이지까지 시도
        
        for (let page = 1; page <= maxPages; page++) {
            try {
                // 페이지별 RSS URL (네이버 블로그는 페이지 파라미터 지원)
                const rssUrl = page === 1 
                    ? `https://rss.blog.naver.com/${blogId}.xml`
                    : `https://rss.blog.naver.com/${blogId}.xml?page=${page}`;
                
                console.log(`RSS URL (페이지 ${page}):`, rssUrl);
                
                // CORS 우회를 위한 프록시 서비스 사용
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;
                
                const response = await fetch(proxyUrl);
                const data = await response.json();
                
                if (data.contents) {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(data.contents, 'text/xml');
                    const items = xmlDoc.querySelectorAll('item');
                    
                    if (items.length === 0) {
                        console.log(`페이지 ${page}: 포스트가 없습니다.`);
                        break; // 더 이상 포스트가 없으면 중단
                    }
                    
                    const pagePosts = Array.from(items).map((item, index) => {
                        const title = item.querySelector('title')?.textContent || '제목 없음';
                        const link = item.querySelector('link')?.textContent || '';
                        const pubDate = item.querySelector('pubDate')?.textContent || '';
                        const author = item.querySelector('author')?.textContent || blogId;
                        
                        return {
                            id: Date.now() + (page * 1000) + index,
                            title: title,
                            url: link,
                            date: formatDate(pubDate),
                            author: author,
                            status: 'unread',
                            folderId: null
                        };
                    });
                    
                    allPosts.push(...pagePosts);
                    console.log(`페이지 ${page}: ${pagePosts.length}개 포스트 추가됨`);
                    
                    // 중복 제거
                    const uniquePosts = allPosts.filter((post, index, self) => 
                        index === self.findIndex(p => p.url === post.url)
                    );
                    
                    if (uniquePosts.length === allPosts.length) {
                        console.log(`페이지 ${page}: 중복 없음, 계속 진행`);
                    } else {
                        console.log(`페이지 ${page}: 중복 제거됨`);
                        allPosts.length = 0;
                        allPosts.push(...uniquePosts);
                    }
                    
                    // 잠시 대기 (서버 부하 방지)
                    await new Promise(resolve => setTimeout(resolve, 500));
                } else {
                    console.log(`페이지 ${page}: 데이터 없음`);
                    break;
                }
            } catch (pageError) {
                console.error(`페이지 ${page} 로드 실패:`, pageError);
                break; // 페이지 로드 실패 시 중단
            }
        }
        
        console.log(`총 ${allPosts.length}개의 포스트를 가져왔습니다.`);
        return allPosts;
        
    } catch (error) {
        console.error('블로그 데이터 가져오기 실패:', error);
        throw new Error('CORS 정책 등으로 불러올 수 없습니다.');
    }
}

// 블로그 ID 추출
function extractBlogId(url) {
    const match = url.match(/blog\.naver\.com\/([^\/\?]+)/);
    return match ? match[1] : null;
}

// 날짜 포맷팅
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\./g, '').replace(/\s/g, '.');
    } catch (error) {
        return new Date().toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\./g, '').replace(/\s/g, '.');
    }
}

// 샘플 포스트 추가 (실제 구현에서는 블로그에서 가져와야 함)
async function addSamplePosts() {
    const defaultUrl = 'https://blog.naver.com/sdedy/223963448085';
    try {
        const blogPosts = await fetchBlogPosts(defaultUrl);
        posts = [...blogPosts, ...posts];
        saveData();
    } catch (error) {
        console.error('기본 블로그 데이터 로드 실패:', error);
        // 실패 시 빈 배열로 시작
        posts = [];
        saveData();
    }
}

// 블로그 구독
async function subscribeToBlog() {
    const url = document.getElementById('blogUrl').value.trim();
    if (!url) {
        alert('블로그 URL을 입력해주세요.');
        return;
    }
    
    if (!subscriptions.includes(url)) {
        try {
            // 블로그 데이터 가져오기 테스트
            const blogPosts = await fetchBlogPosts(url);
            
            subscriptions.push(url);
            saveData();
            
            // 새로운 포스트 추가
            const existingUrls = posts.map(post => post.url);
            const uniqueNewPosts = blogPosts.filter(post => !existingUrls.includes(post.url));
            
            if (uniqueNewPosts.length > 0) {
                posts.unshift(...uniqueNewPosts);
                saveData();
                renderPosts();
                alert(`구독이 완료되었습니다. ${uniqueNewPosts.length}개의 포스트가 추가되었습니다.`);
            } else {
                alert('구독이 완료되었습니다. (새로운 포스트 없음)');
            }
        } catch (error) {
            console.error('구독 실패:', error);
            alert(error.message || 'CORS 정책 등으로 불러올 수 없습니다.');
        }
    } else {
        alert('이미 구독 중인 블로그입니다.');
    }
}

// 포스트 최신화
async function refreshPosts() {
    try {
        // 구독된 모든 블로그에서 최신 포스트 가져오기
        const newPosts = [];
        
        for (const subscription of subscriptions) {
            try {
                const blogPosts = await fetchBlogPosts(subscription);
                newPosts.push(...blogPosts);
            } catch (error) {
                console.error(`블로그 ${subscription} 최신화 실패:`, error);
                // 개별 블로그 실패는 무시하고 계속 진행
            }
        }
        
        if (newPosts.length === 0) {
            alert('CORS 정책 등으로 불러올 수 없습니다.');
            return;
        }
        
        // 기존 포스트와 중복 제거
        const existingUrls = posts.map(post => post.url);
        const uniqueNewPosts = newPosts.filter(post => !existingUrls.includes(post.url));
        
        if (uniqueNewPosts.length > 0) {
            posts.unshift(...uniqueNewPosts);
            saveData();
            renderPosts();
            alert(`${uniqueNewPosts.length}개의 새로운 포스트가 추가되었습니다.`);
        } else {
            alert('새로운 포스트가 없습니다.');
        }
    } catch (error) {
        console.error('최신화 실패:', error);
        alert('CORS 정책 등으로 불러올 수 없습니다.');
    }
}

// 새 폴더 추가
function addNewFolder(parentId = null) {
    const folderName = prompt('폴더 이름을 입력하세요:');
    if (folderName && folderName.trim()) {
        const newFolder = {
            id: Date.now(),
            name: folderName.trim(),
            postIds: [],
            parentId: parentId,
            children: []
        };
        
        // 부모 폴더가 있으면 children 배열에 추가
        if (parentId) {
            const parentFolder = folders.find(f => f.id === parentId);
            if (parentFolder) {
                if (!parentFolder.children) parentFolder.children = [];
                parentFolder.children.push(newFolder.id);
            }
        }
        
        folders.push(newFolder);
        saveData();
        renderFolders();
    }
}

// 하위 폴더 추가
function addSubFolder(parentId) {
    const parentFolder = folders.find(f => f.id === parentId);
    if (parentFolder) {
        addNewFolder(parentId);
    }
}

// 전체 구독 목록 표시
function showAllSubscriptions() {
    currentFolder = null;
    
    // 활성 폴더 표시 제거
    document.querySelectorAll('.folder-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 패널 제목 업데이트
    document.getElementById('centerPanelTitle').textContent = '전체 구독 목록';
    
    renderPosts();
}

// 폴더 삭제
function deleteFolder(folderId) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    if (confirm(`"${folder.name}" 폴더를 삭제하시겠습니까?\n폴더 내의 포스트들은 전체 구독 목록으로 이동됩니다.`)) {
        // 폴더 내 포스트들을 전체 구독 목록으로 이동
        posts.forEach(post => {
            if (post.folderId === folderId) {
                post.folderId = null;
            }
        });
        
        // 하위 폴더들도 삭제
        if (folder.children && folder.children.length > 0) {
            folder.children.forEach(childId => {
                deleteFolder(childId);
            });
        }
        
        // 부모 폴더에서 이 폴더 제거
        if (folder.parentId) {
            const parentFolder = folders.find(f => f.id === folder.parentId);
            if (parentFolder && parentFolder.children) {
                parentFolder.children = parentFolder.children.filter(id => id !== folderId);
            }
        }
        
        // 폴더 삭제
        folders = folders.filter(f => f.id !== folderId);
        
        // 현재 선택된 폴더가 삭제된 폴더라면 전체 구독 목록으로 이동
        if (currentFolder === folderId) {
            showAllSubscriptions();
        }
        
        saveData();
        renderFolders();
        renderPosts();
    }
}

// 폴더 렌더링
function renderFolders() {
    const folderList = document.getElementById('folderList');
    folderList.innerHTML = '';
    
    // 최상위 폴더들만 먼저 렌더링
    const topLevelFolders = folders.filter(folder => !folder.parentId);
    
    topLevelFolders.forEach(folder => {
        renderFolderItem(folder, folderList, 0);
    });
    
    // 드래그 앤 드롭 설정
    setupFolderDragAndDrop();
}

// 개별 폴더 아이템 렌더링 (재귀적)
function renderFolderItem(folder, container, level) {
    const folderItem = document.createElement('div');
    folderItem.className = 'folder-item';
    folderItem.dataset.folderId = folder.id;
    folderItem.style.marginLeft = `${level * 20}px`;
    
    const postCount = posts.filter(post => post.folderId === folder.id).length;
    const hasChildren = folder.children && folder.children.length > 0;
    
    folderItem.innerHTML = `
        <div class="folder-icon">${hasChildren ? '📂' : '📁'}</div>
        <div class="folder-name" contenteditable="false">${folder.name}</div>
        <div class="folder-actions">
            <button class="sub-folder-btn" title="하위 폴더 추가">+</button>
            <button class="delete-folder-btn" title="폴더 삭제">×</button>
            <div class="folder-count">${postCount}</div>
        </div>
    `;
    
    // 폴더 클릭 이벤트
    folderItem.addEventListener('click', function(e) {
        if (e.target.classList.contains('folder-name') || 
            e.target.classList.contains('sub-folder-btn') || 
            e.target.classList.contains('delete-folder-btn')) return;
        selectFolder(folder.id);
    });
    
    // 하위 폴더 추가 버튼
    const subFolderBtn = folderItem.querySelector('.sub-folder-btn');
    subFolderBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        addSubFolder(folder.id);
    });
    
    // 폴더 삭제 버튼
    const deleteFolderBtn = folderItem.querySelector('.delete-folder-btn');
    deleteFolderBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        deleteFolder(folder.id);
    });
    
    // 더블클릭으로 이름 편집
    const folderName = folderItem.querySelector('.folder-name');
    folderName.addEventListener('dblclick', function() {
        this.contentEditable = true;
        this.focus();
        this.classList.add('editing');
    });
    
    folderName.addEventListener('blur', function() {
        this.contentEditable = false;
        this.classList.remove('editing');
        const newName = this.textContent.trim();
        if (newName && newName !== folder.name) {
            folder.name = newName;
            saveData();
        } else {
            this.textContent = folder.name;
        }
    });
    
    folderName.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.blur();
        }
    });
    
    container.appendChild(folderItem);
    
    // 하위 폴더들 렌더링
    if (hasChildren) {
        folder.children.forEach(childId => {
            const childFolder = folders.find(f => f.id === childId);
            if (childFolder) {
                renderFolderItem(childFolder, container, level + 1);
            }
        });
    }
}

// 폴더 선택
function selectFolder(folderId) {
    currentFolder = folderId;
    
    // 활성 폴더 표시
    document.querySelectorAll('.folder-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-folder-id="${folderId}"]`).classList.add('active');
    
    // 패널 제목 업데이트
    const folder = folders.find(f => f.id === folderId);
    document.getElementById('centerPanelTitle').textContent = folder.name;
    
    renderPosts();
}

// 포스트 렌더링
function renderPosts() {
    const postList = document.getElementById('postList');
    postList.innerHTML = '';
    
    let filteredPosts = posts;
    
    // 폴더 필터링 (하위 폴더 포함)
    if (currentFolder) {
        const folderIds = getAllFolderIds(currentFolder);
        filteredPosts = posts.filter(post => folderIds.includes(post.folderId));
    } else {
        // 전체 구독 목록에서는 폴더에 속하지 않은 포스트만 표시
        filteredPosts = posts.filter(post => post.folderId === null);
    }
    
    // 정렬
    const sortOption = document.getElementById('sortSelect').value;
    filteredPosts.sort((a, b) => {
        if (sortOption === 'latest') {
            return new Date(b.date) - new Date(a.date);
        } else if (sortOption === 'oldest') {
            return new Date(a.date) - new Date(b.date);
        } else if (sortOption === 'title') {
            return a.title.localeCompare(b.title);
        }
    });
    
    // 읽은 글을 하단으로 이동
    const unreadPosts = filteredPosts.filter(post => post.status !== 'read');
    const readPosts = filteredPosts.filter(post => post.status === 'read');
    filteredPosts = [...unreadPosts, ...readPosts];
    
    filteredPosts.forEach(post => {
        const postItem = document.createElement('div');
        postItem.className = `post-item ${post.status === 'read' ? 'read' : ''}`;
        postItem.dataset.postId = post.id;
        
        const statusText = post.status === 'reading' ? '읽는 중' : '읽기';
        
        postItem.innerHTML = `
            <div class="post-header">
                <div class="post-meta">
                    <span>${post.date}</span>
                    <span>${post.author}</span>
                </div>
                <div class="post-status">
                    <button class="status-btn ${post.status}" onclick="togglePostStatus(${post.id})">
                        ${statusText}
                    </button>
                    <button class="read-btn" onclick="markAsRead(${post.id})">
                        다 읽음
                    </button>
                </div>
            </div>
            <div class="post-title">${post.title}</div>
        `;
        
        // 포스트 클릭 이벤트 (단일 클릭: 메모 표시)
        let clickTimeout;
        postItem.addEventListener('click', function(e) {
            if (e.target.classList.contains('status-btn') || e.target.classList.contains('read-btn')) return;
            
            // 단일 클릭 처리
            clearTimeout(clickTimeout);
            clickTimeout = setTimeout(() => {
                // 메모만 표시 (iframe은 열지 않음)
                currentPost = post;
                loadMemo(post.id);
                
                // 포스트 목록은 그대로 유지
                const postList = document.getElementById('postList');
                const postContent = document.getElementById('postContent');
                postList.style.display = 'block';
                postContent.style.display = 'none';
                
                // 제목 복원
                const centerPanelTitle = document.getElementById('centerPanelTitle');
                if (currentFolder) {
                    const folder = folders.find(f => f.id === currentFolder);
                    centerPanelTitle.textContent = folder ? folder.name : '전체 구독 목록';
                } else {
                    centerPanelTitle.textContent = '전체 구독 목록';
                }
            }, 200); // 더블클릭 감지를 위한 지연
        });
        
        // 포스트 더블클릭 이벤트 (더블클릭: iframe 열기)
        postItem.addEventListener('dblclick', function(e) {
            if (e.target.classList.contains('status-btn') || e.target.classList.contains('read-btn')) return;
            
            // 단일 클릭 타이머 취소
            clearTimeout(clickTimeout);
            
            // iframe 열기
            openPost(post);
        });
        
        // 드래그 앤 드롭 설정
        postItem.draggable = true;
        postItem.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', post.id);
            this.classList.add('dragging');
        });
        
        postItem.addEventListener('dragend', function() {
            this.classList.remove('dragging');
        });
        
        postList.appendChild(postItem);
    });
    
    // 폴더로 드롭 영역 설정
    setupPostDropZones();
}

// 포스트 상태 토글 (읽기 <-> 읽는 중)
function togglePostStatus(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    if (post.status === 'unread') {
        post.status = 'reading';
    } else if (post.status === 'reading') {
        post.status = 'unread';
    } else {
        // 'read' 상태인 경우 'unread'로 변경
        post.status = 'unread';
    }
    
    saveData();
    renderPosts();
}

// 포스트를 "다 읽음"으로 표시
function markAsRead(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    post.status = 'read';
    saveData();
    renderPosts();
}

// 포스트 열기 (인라인 표시)
function openPost(post) {
    currentPost = post;
    displayPostContent(post);
    loadMemo(post.id);
}

// 포스트 내용 표시 (iframe 방식)
async function displayPostContent(post) {
    const postList = document.getElementById('postList');
    const postContent = document.getElementById('postContent');
    const postDateAuthor = document.getElementById('postDateAuthor');
    const postOriginalLink = document.getElementById('postOriginalLink');
    const postIframe = document.getElementById('postIframe');
    
    // 포스트 목록 숨기고 내용 표시
    postList.style.display = 'none';
    postContent.style.display = 'flex';
    
    // 헤더 정보 설정
    postDateAuthor.textContent = `${post.date} | ${post.author}`;
    postOriginalLink.href = post.url;
    
    // iframe에 URL 로드
    try {
        postIframe.src = post.url;
        
        // iframe 로드 완료 이벤트
        postIframe.onload = function() {
            console.log('iframe 로드 완료');
        };
        
        // iframe 로드 실패 시 처리
        postIframe.onerror = function() {
            console.log('iframe 로드 실패, 원본 링크로 대체');
            // iframe 로드 실패 시 원본 링크를 새 탭에서 열도록 안내
            postIframe.srcdoc = `
                <html>
                <head>
                    <style>
                        body { 
                            font-family: 'Noto Sans KR', sans-serif; 
                            display: flex; 
                            flex-direction: column; 
                            align-items: center; 
                            justify-content: center; 
                            height: 100vh; 
                            margin: 0; 
                            background: #f8f9fa; 
                            color: #333; 
                        }
                        .message { 
                            text-align: center; 
                            padding: 40px; 
                            background: white; 
                            border-radius: 8px; 
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
                            max-width: 500px; 
                        }
                        .btn { 
                            display: inline-block; 
                            padding: 12px 24px; 
                            background: #007bff; 
                            color: white; 
                            text-decoration: none; 
                            border-radius: 6px; 
                            margin-top: 20px; 
                            transition: background-color 0.3s; 
                        }
                        .btn:hover { 
                            background: #0056b3; 
                        }
                    </style>
                </head>
                <body>
                    <div class="message">
                        <h3>페이지를 표시할 수 없습니다</h3>
                        <p>이 페이지는 보안 정책으로 인해 iframe에서 표시할 수 없습니다.</p>
                        <p>아래 버튼을 클릭하여 원본 페이지를 새 탭에서 확인하세요.</p>
                        <a href="${post.url}" target="_blank" class="btn">원본 페이지 보기</a>
                    </div>
                </body>
                </html>
            `;
        };
        
    } catch (error) {
        console.error('iframe 로드 실패:', error);
        // 에러 발생 시 원본 링크로 대체
        postIframe.srcdoc = `
            <html>
            <head>
                <style>
                    body { 
                        font-family: 'Noto Sans KR', sans-serif; 
                        display: flex; 
                        flex-direction: column; 
                        align-items: center; 
                        justify-content: center; 
                        height: 100vh; 
                        margin: 0; 
                        background: #f8f9fa; 
                        color: #333; 
                    }
                    .message { 
                        text-align: center; 
                        padding: 40px; 
                        background: white; 
                        border-radius: 8px; 
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
                        max-width: 500px; 
                    }
                    .btn { 
                        display: inline-block; 
                        padding: 12px 24px; 
                        background: #007bff; 
                        color: white; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        margin-top: 20px; 
                        transition: background-color 0.3s; 
                    }
                    .btn:hover { 
                        background: #0056b3; 
                    }
                </style>
            </head>
            <body>
                <div class="message">
                    <h3>페이지를 표시할 수 없습니다</h3>
                    <p>페이지 로드 중 오류가 발생했습니다.</p>
                    <p>아래 버튼을 클릭하여 원본 페이지를 새 탭에서 확인하세요.</p>
                    <a href="${post.url}" target="_blank" class="btn">원본 페이지 보기</a>
                </div>
            </body>
            </html>
        `;
    }
}



// 포스트 목록으로 돌아가기
function backToPostList() {
    currentPost = null;
    
    const postList = document.getElementById('postList');
    const postContent = document.getElementById('postContent');
    const postIframe = document.getElementById('postIframe');
    
    // 포스트 목록 다시 표시하고 내용 숨기기
    postList.style.display = 'block';
    postContent.style.display = 'none';
    
    // iframe 정리
    if (postIframe) {
        postIframe.src = '';
        postIframe.srcdoc = '';
    }
    
    // 제목 복원
    const centerPanelTitle = document.getElementById('centerPanelTitle');
    if (currentFolder) {
        const folder = folders.find(f => f.id === currentFolder);
        centerPanelTitle.textContent = folder ? folder.name : '전체 구독 목록';
    } else {
        centerPanelTitle.textContent = '전체 구독 목록';
    }
    
    // 메모 초기화
    document.getElementById('memoText').value = '';
}

// 하위 폴더 ID들을 모두 가져오기 (재귀적)
function getAllFolderIds(folderId) {
    const folderIds = [folderId];
    const folder = folders.find(f => f.id === folderId);
    
    if (folder && folder.children && folder.children.length > 0) {
        folder.children.forEach(childId => {
            folderIds.push(...getAllFolderIds(childId));
        });
    }
    
    return folderIds;
}

// 메모 로드
async function loadMemo(postId) {
    const memoText = document.getElementById('memoText');
    
    if (currentUser && githubToken) {
        // GitHub Gist에서 메모 로드
        try {
            const response = await fetch(`https://api.github.com/gists?per_page=100`, {
                headers: {
                    'Authorization': `token ${githubToken}`
                }
            });
            
            if (response.ok) {
                const gists = await response.json();
                const memoGist = gists.find(gist => 
                    gist.description === `민열지식로그 메모 - ${currentUser.login}`
                );
                
                if (memoGist) {
                    const memoFile = memoGist.files[`memo_${postId}.txt`];
                    if (memoFile) {
                        memoText.value = memoFile.content;
                        return;
                    }
                }
            }
        } catch (error) {
            console.error('GitHub에서 메모 로드 실패:', error);
        }
    }
    
    // 로컬 스토리지에서 메모 로드
    const memos = JSON.parse(localStorage.getItem('memos') || '{}');
    const memoData = memos[postId];

    if (memoData) {
        memoText.value = memoData.text;
    } else {
        memoText.value = '';
    }
}

// 메모 저장
async function saveMemo() {
    if (!currentPost) {
        alert('저장할 포스트를 선택해주세요.');
        return;
    }

    const memoText = document.getElementById('memoText');
    const postId = currentPost.id;

    if (currentUser && githubToken) {
        // GitHub Gist에 메모 저장
        try {
            const memoContent = memoText.value;
            
            // 기존 Gist 찾기
            const response = await fetch(`https://api.github.com/gists?per_page=100`, {
                headers: {
                    'Authorization': `token ${githubToken}`
                }
            });
            
            if (response.ok) {
                const gists = await response.json();
                const existingGist = gists.find(gist => 
                    gist.description === `민열지식로그 메모 - ${currentUser.login}`
                );
                
                const gistData = {
                    description: `민열지식로그 메모 - ${currentUser.login}`,
                    public: false,
                    files: {
                        [`memo_${postId}.txt`]: {
                            content: memoContent
                        }
                    }
                };
                
                if (existingGist) {
                    // 기존 Gist 업데이트
                    gistData.files = { ...existingGist.files, ...gistData.files };
                    await fetch(`https://api.github.com/gists/${existingGist.id}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `token ${githubToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(gistData)
                    });
                } else {
                    // 새 Gist 생성
                    await fetch('https://api.github.com/gists', {
                        method: 'POST',
                        headers: {
                            'Authorization': `token ${githubToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(gistData)
                    });
                }
                
                alert('메모가 클라우드에 저장되었습니다.');
                return;
            }
        } catch (error) {
            console.error('GitHub에 메모 저장 실패:', error);
            alert('클라우드 저장에 실패했습니다. 로컬에 저장합니다.');
        }
    }
    
    // 로컬 저장
    saveMemoLocally(postId, memoText);
}

// 메모 저장 (로컬)
function saveMemoLocally(postId, memoText) {
    const memoData = {
        postId: postId,
        text: memoText.value,
        timestamp: new Date().toISOString()
    };
    
    // 로컬 스토리지에 저장
    const memos = JSON.parse(localStorage.getItem('memos') || '{}');
    memos[postId] = memoData;
    localStorage.setItem('memos', JSON.stringify(memos));
    
    alert('메모가 로컬에 저장되었습니다.');
}

// 폴더 드래그 앤 드롭 설정
function setupFolderDragAndDrop() {
    const folderList = document.getElementById('folderList');
    
    folderList.addEventListener('dragover', function(e) {
        e.preventDefault();
    });
    
    folderList.addEventListener('drop', function(e) {
        e.preventDefault();
        const postId = parseInt(e.dataTransfer.getData('text/plain'));
        const folderItem = e.target.closest('.folder-item');
        
        if (folderItem) {
            const folderId = parseInt(folderItem.dataset.folderId);
            const post = posts.find(p => p.id === postId);
            
            if (post) {
                post.folderId = folderId;
                saveData();
                renderFolders();
                renderPosts();
            }
        }
    });
}

// 포스트 드롭 영역 설정
function setupPostDropZones() {
    const folderItems = document.querySelectorAll('.folder-item');
    
    folderItems.forEach(item => {
        item.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('drop-zone');
        });
        
        item.addEventListener('dragleave', function(e) {
            if (!this.contains(e.relatedTarget)) {
                this.classList.remove('drop-zone');
            }
        });
        
        item.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drop-zone');
            
            const postId = parseInt(e.dataTransfer.getData('text/plain'));
            const folderId = parseInt(this.dataset.folderId);
            const post = posts.find(p => p.id === postId);
            
            if (post) {
                post.folderId = folderId;
                saveData();
                renderFolders();
                renderPosts();
            }
        });
    });
}

// 모달 열기
function openModal(title, content) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalContent').innerHTML = content;
    document.getElementById('modal').style.display = 'block';
}

// 모달 닫기
function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// 데이터 저장
function saveData() {
    if (currentUser && githubToken) {
        // 사용자가 로그인된 경우 GitHub Gist에 저장
        saveUserData();
    } else {
        // 로컬 스토리지에 저장
        localStorage.setItem('folders', JSON.stringify(folders));
        localStorage.setItem('posts', JSON.stringify(posts));
        localStorage.setItem('subscriptions', JSON.stringify(subscriptions));
    }
}

// 데이터 로드
function loadData() {
    if (currentUser && githubToken) {
        // 사용자가 로그인된 경우 GitHub Gist에서 로드
        loadUserData();
    } else {
        // 로컬 스토리지에서 로드
        const savedFolders = localStorage.getItem('folders');
        const savedPosts = localStorage.getItem('posts');
        const savedSubscriptions = localStorage.getItem('subscriptions');
        
        if (savedFolders) folders = JSON.parse(savedFolders);
        if (savedPosts) posts = JSON.parse(savedPosts);
        if (savedSubscriptions) subscriptions = JSON.parse(savedSubscriptions);
    }
}

// 페이지 캡처 기능


// 전역 함수로 노출
window.togglePostStatus = togglePostStatus;
window.backToPostList = backToPostList;

// GitHub OAuth 로그인
function loginWithGitHub() {
    // GitHub OAuth 앱이 설정되지 않은 경우 안내
    if (GITHUB_CLIENT_ID === 'your_github_client_id') {
        alert('GitHub OAuth 앱이 설정되지 않았습니다.\n\n설정 방법:\n1. GitHub.com > Settings > Developer settings > OAuth Apps\n2. New OAuth App 생성\n3. Client ID를 script.js에 입력');
        return;
    }
    
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&scope=gist`;
    window.location.href = authUrl;
}

// GitHub OAuth 콜백 처리
function handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
        // URL에서 code 파라미터 제거
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        // 토큰 교환
        exchangeCodeForToken(code);
    }
}

// 코드를 토큰으로 교환 (클라이언트 사이드 구현)
async function exchangeCodeForToken(code) {
    try {
        // GitHub OAuth 앱의 Client Secret이 필요하므로, 
        // 실제 구현에서는 서버에서 토큰 교환을 처리해야 합니다.
        // 여기서는 간단한 예시로 처리합니다.
        
        console.log('GitHub OAuth 코드 받음:', code);
        
        // 실제 구현을 위해서는 다음 중 하나를 선택해야 합니다:
        // 1. GitHub OAuth App을 Public으로 설정 (보안상 권장하지 않음)
        // 2. 서버 사이드에서 토큰 교환 처리
        
        // 임시로 사용자 정보를 설정 (실제 구현에서는 서버에서 처리)
        const tempUser = {
            login: 'temp_user_' + Date.now(),
            id: Date.now(),
            avatar_url: 'https://github.com/github.png'
        };
        
        currentUser = tempUser;
        githubToken = 'temp_token_' + Date.now(); // 실제 구현에서는 서버에서 받은 토큰
        
        // 로컬 스토리지에 저장
        localStorage.setItem('githubToken', githubToken);
        localStorage.setItem('githubUser', JSON.stringify(currentUser));
        
        updateUserInterface();
        loadUserData();
        
        alert('GitHub 로그인이 완료되었습니다! (임시 구현)\n\n실제 구현을 위해서는 서버 사이드 토큰 교환이 필요합니다.');
        
    } catch (error) {
        console.error('토큰 교환 실패:', error);
        alert('로그인에 실패했습니다.');
    }
}

// 사용자 인터페이스 업데이트
function updateUserInterface() {
    const loginBtn = document.getElementById('loginBtn');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    
    if (currentUser) {
        loginBtn.style.display = 'none';
        userInfo.style.display = 'flex';
        userName.textContent = currentUser.login;
    } else {
        loginBtn.style.display = 'block';
        userInfo.style.display = 'none';
    }
}

// 로그아웃
function logout() {
    currentUser = null;
    githubToken = null;
    localStorage.removeItem('githubToken');
    localStorage.removeItem('githubUser');
    updateUserInterface();
    
    // 로컬 데이터로 되돌리기
    loadData();
    renderFolders();
    renderPosts();
    
    alert('로그아웃되었습니다.');
}

// 사용자별 데이터 로드
async function loadUserData() {
    if (!currentUser || !githubToken) return;
    
    try {
        // GitHub Gist에서 사용자 데이터 로드
        const response = await fetch(`https://api.github.com/gists?per_page=100`, {
            headers: {
                'Authorization': `token ${githubToken}`
            }
        });
        
        if (response.ok) {
            const gists = await response.json();
            const userDataGist = gists.find(gist => 
                gist.description === `민열지식로그 데이터 - ${currentUser.login}`
            );
            
            if (userDataGist) {
                const dataFile = userDataGist.files['userdata.json'];
                if (dataFile) {
                    const userData = JSON.parse(dataFile.content);
                    folders = userData.folders || [];
                    posts = userData.posts || [];
                    subscriptions = userData.subscriptions || [];
                    
                    saveData();
                    renderFolders();
                    renderPosts();
                }
            }
        }
    } catch (error) {
        console.error('사용자 데이터 로드 실패:', error);
        // 실패 시 로컬 데이터 사용
        loadData();
    }
}

// 사용자별 데이터 저장
async function saveUserData() {
    if (!currentUser || !githubToken) return;
    
    try {
        const userData = {
            folders: folders,
            posts: posts,
            subscriptions: subscriptions,
            lastUpdated: new Date().toISOString()
        };
        
        // 기존 Gist 찾기
        const response = await fetch(`https://api.github.com/gists?per_page=100`, {
            headers: {
                'Authorization': `token ${githubToken}`
            }
        });
        
        if (response.ok) {
            const gists = await response.json();
            const existingGist = gists.find(gist => 
                gist.description === `민열지식로그 데이터 - ${currentUser.login}`
            );
            
            const gistData = {
                description: `민열지식로그 데이터 - ${currentUser.login}`,
                public: false,
                files: {
                    'userdata.json': {
                        content: JSON.stringify(userData, null, 2)
                    }
                }
            };
            
            if (existingGist) {
                // 기존 Gist 업데이트
                await fetch(`https://api.github.com/gists/${existingGist.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(gistData)
                });
            } else {
                // 새 Gist 생성
                await fetch('https://api.github.com/gists', {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(gistData)
                });
            }
        }
    } catch (error) {
        console.error('사용자 데이터 저장 실패:', error);
        // 실패 시 로컬 저장으로 폴백
        saveData();
    }
}
