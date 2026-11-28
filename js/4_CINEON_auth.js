const authForm = document.querySelector(".auth-form");
const authMessage = document.getElementById("auth-message");
const loginForm = document.getElementById("login-form");
const authSessionKey = "cineon-current-user";
const demoAccounts = new Map([
    ["cineon-demo", {
        name: "시네산책",
        passwordHash: "2d3f445947b7daba7192e88f01912eb342364fa89dafbb674433e7a7ee2c41f6",
        reviews: {
            chiikawa: { rating: 4.5, comment: "섬의 풍경과 친구들이 서로 챙겨 주는 장면이 기억에 남았어요." },
            tazza: { rating: 4, comment: "서로의 패를 읽으려는 두 친구의 긴장감이 좋았어요." }
        }
    }],
    ["hamada", {
        name: "하마다",
        passwordHash: "4bff8e4199f149676265ccc1057f0c22be9e95a0bfa545ba4cefd0e800c8a0aa",
        reviews: {
            tazza: { rating: 5, comment: "마지막 판까지 누가 속이는지 몰라서 숨 죽이고 봤어요." },
            whale: { rating: 4.5, comment: "고래 뱃속 장면의 압박감이 대단했어요. 한 번 더 보러 갑니다." }
        }
    }]
]);
const userMenu = document.querySelector(".user-menu");
const loginLink = userMenu.querySelector('a[href="4_CINEON_login.html"]');
const signupLink = userMenu.querySelector('a[href="4_CINEON_signup.html"]');
const mypageLayout = document.querySelector(".mypage-layout, [data-account-page]");
const accountName = document.createElement("a");
const menuLogout = document.createElement("button");

accountName.className = "user-menu-name";
accountName.href = "4_CINEON_mypage.html";
accountName.title = "마이페이지";
accountName.hidden = true;
menuLogout.type = "button";
menuLogout.className = "user-menu-logout";
menuLogout.innerText = "로그아웃";
menuLogout.hidden = true;
userMenu.insertBefore(accountName, signupLink);
userMenu.insertBefore(menuLogout, signupLink);

function readAccount(username) {
    const localAccount = JSON.parse(localStorage.getItem("cineon-account-" + username));
    return localAccount || demoAccounts.get(username) || null;
}

function personalReviewStorageKey(username, movieId) {
    return "cineon:personal-review:" + JSON.stringify([username, movieId]);
}

function readPersonalReview(username, movieId) {
    const saved = localStorage.getItem(personalReviewStorageKey(username, movieId));
    if (saved !== null) {
        return JSON.parse(saved);
    }
    const reviews = demoAccounts.get(username)?.reviews;
    return reviews && Object.hasOwn(reviews, movieId) ? reviews[movieId] : null;
}

function movieWishKey(poster) {
    return "cineon:movie-wish:" + poster;
}

function isMovieWished(poster) {
    const saved = localStorage.getItem(movieWishKey(poster));
    if (saved !== null) {
        return saved === "true";
    }
    const id = poster.match(/4_poster-([^.]+)\.[^.]+$/)?.[1];
    return localStorage.getItem("cineon-like-" + poster) === "true" ||
        Boolean(id && localStorage.getItem("cineon:movie-like:" + id) === "true");
}

function setMovieWished(poster, wished) {
    localStorage.setItem(movieWishKey(poster), String(wished));
}

function showAuthMessage(text) {
    authMessage.innerText = text;
    authMessage.hidden = false;
}

function showMypageAccount(account) {
    if (!mypageLayout) {
        return;
    }
    if (!account) {
        mypageLayout.hidden = true;
        window.location.replace(loginLink.href);
        return;
    }

    const nickname = mypageLayout.querySelector(".mypage-nickname");
    if (nickname) {
        nickname.textContent = nickname.dataset.previewName || account.name + "님";
    }
    mypageLayout.hidden = false;
}

function updateAccountMenu() {
    const username = localStorage.getItem(authSessionKey);
    const account = username ? readAccount(username) : null;
    loginLink.hidden = Boolean(account);
    signupLink.hidden = Boolean(account);
    accountName.innerText = account ? account.name + "님" : "";
    accountName.hidden = !account;
    menuLogout.hidden = !account;
    showMypageAccount(account);

    if (loginForm) {
        loginForm.hidden = Boolean(account);
        document.querySelector(".auth-switch").hidden = Boolean(account);
        document.querySelector(".auth-signed-in").hidden = !account;
        document.getElementById("auth-heading").innerText = account ? account.name + "님, 환영합니다!" : "로그인";
    }
}

// 웹 스토리지에는 실습용 비밀번호 원문 대신 비교용 해시를 저장합니다.
function hashDemoPassword(username, password) {
    const bytes = new TextEncoder().encode(username + "\n" + password);
    return crypto.subtle.digest("SHA-256", bytes).then(function (hash) {
        const values = new Uint8Array(hash);
        let result = "";
        for (let i = 0; i < values.length; i++) {
            result += ("0" + values[i].toString(16)).slice(-2);
        }
        return result;
    });
}

function refreshAccountMenu() {
    try {
        updateAccountMenu();
    } catch (error) {
        showMypageAccount(null);
        if (authForm) {
            showAuthMessage("브라우저 저장소를 사용할 수 없습니다.");
        }
    }
}

refreshAccountMenu();

if (mypageLayout) {
    if (mypageLayout.classList.contains("mypage-layout")) {
        accountName.setAttribute("aria-current", "page");
    }

    window.addEventListener("pageshow", function (event) {
        if (event.persisted) {
            refreshAccountMenu();
        }
    });

    window.addEventListener("storage", function (event) {
        if (event.key === authSessionKey || event.key === null) {
            refreshAccountMenu();
        }
    });
}

if (authForm && window.crypto && crypto.subtle) {
    const submitButton = authForm.querySelector('button[type="submit"]');
    submitButton.disabled = false;

    authForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const username = document.getElementById("auth-username").value.trim();
        const password = document.getElementById("auth-password").value;
        const name = loginForm ? "" : document.getElementById("auth-name").value.trim();

        if (!username || (!loginForm && !name)) {
            showAuthMessage("아이디와 닉네임을 확인해 주세요.");
            return;
        }
        if (!loginForm && password !== document.getElementById("auth-confirm").value) {
            showAuthMessage("비밀번호 확인이 일치하지 않습니다.");
            return;
        }

        submitButton.disabled = true;
        hashDemoPassword(username, password).then(function (passwordHash) {
            const account = readAccount(username);
            if (loginForm) {
                if (!account || account.passwordHash !== passwordHash) {
                    showAuthMessage("아이디 또는 비밀번호를 확인해 주세요.");
                    return;
                }
                localStorage.setItem(authSessionKey, username);
                const back_page = sessionStorage.getItem("cineon_after_login");
                if (back_page) {
                    sessionStorage.removeItem("cineon_after_login");
                    window.location.href = back_page;
                    return;
                }
                if (demoAccounts.has(username)) {
                    window.location.href = accountName.href;
                    return;
                }
                loginForm.reset();
                authMessage.hidden = true;
                updateAccountMenu();
            } else if (account) {
                showAuthMessage("이미 사용 중인 아이디입니다.");
            } else {
                localStorage.setItem("cineon-account-" + username, JSON.stringify({
                    name: name,
                    passwordHash: passwordHash
                }));
                alert("회원가입이 완료되었습니다.");
                window.location.href = "4_CINEON_login.html";
            }
        }).catch(function () {
            showAuthMessage("계정 정보를 처리할 수 없습니다. 브라우저 저장소 설정을 확인해 주세요.");
        }).then(function () {
            submitButton.disabled = false;
        });
    });
} else if (authForm) {
    showAuthMessage("로그인과 회원가입은 localhost 또는 HTTPS에서 사용할 수 있습니다.");
}

function logout() {
    localStorage.removeItem(authSessionKey);
    updateAccountMenu();
    if (authMessage) {
        authMessage.hidden = true;
    }
    alert("로그아웃되었습니다.");
}

menuLogout.addEventListener("click", logout);
if (loginForm) {
    document.querySelector(".auth-logout").addEventListener("click", logout);
}
