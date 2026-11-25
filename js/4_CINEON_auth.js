const authForm = document.querySelector(".auth-form");
const authMessage = document.getElementById("auth-message");
const loginForm = document.getElementById("login-form");
const authSessionKey = "cineon-current-user";
const userMenu = document.querySelector(".user-menu");
const loginLink = userMenu.querySelector('a[href="4_CINEON_login.html"]');
const signupLink = userMenu.querySelector('a[href="4_CINEON_signup.html"]');
const accountName = document.createElement("span");
const menuLogout = document.createElement("button");

accountName.className = "user-menu-name";
accountName.hidden = true;
menuLogout.type = "button";
menuLogout.className = "user-menu-logout";
menuLogout.innerText = "로그아웃";
menuLogout.hidden = true;
userMenu.insertBefore(accountName, signupLink);
userMenu.insertBefore(menuLogout, signupLink);

function readAccount(username) {
    return JSON.parse(localStorage.getItem("cineon-account-" + username));
}

function showAuthMessage(text) {
    authMessage.innerText = text;
    authMessage.hidden = false;
}

function updateAccountMenu() {
    const username = localStorage.getItem(authSessionKey);
    const account = username ? readAccount(username) : null;
    loginLink.hidden = Boolean(account);
    signupLink.hidden = Boolean(account);
    accountName.innerText = account ? account.name + "님" : "";
    accountName.hidden = !account;
    menuLogout.hidden = !account;

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

try {
    updateAccountMenu();
} catch (error) {
    if (authForm) {
        showAuthMessage("브라우저 저장소를 사용할 수 없습니다.");
    }
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
