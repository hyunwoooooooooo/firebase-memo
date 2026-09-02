import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// Firebase Console > 프로젝트 설정 > 내 앱 > SDK 설정 및 구성에서 복사한 값으로 바꾸세요.
// Firebase 웹용 설정값은 프로젝트 식별 정보이며, 실제 데이터 접근은 firestore.rules가 보호합니다.

  const firebaseConfig = {
    apiKey: "AIzaSyCgio6RN53D1u4NtbyccD6acWVELYtxFPw",
    authDomain: "hyun-memo-43368.firebaseapp.com",
    projectId: "hyun-memo-43368",
    storageBucket: "hyun-memo-43368.firebasestorage.app",
    messagingSenderId: "90439199475",
    appId: "1:90439199475:web:052b9ef92d9e9d0715e586",
    measurementId: "G-NYG921TRGF"
  };

const elements = {
  authView: document.querySelector("#auth-view"),
  memoView: document.querySelector("#memo-view"),
  loginTab: document.querySelector("#login-tab"),
  signupTab: document.querySelector("#signup-tab"),
  loginForm: document.querySelector("#login-form"),
  signupForm: document.querySelector("#signup-form"),
  authTitle: document.querySelector("#auth-title"),
  authDescription: document.querySelector("#auth-description"),
  authMessage: document.querySelector("#auth-message"),
  setupNotice: document.querySelector("#setup-notice"),
  loginEmail: document.querySelector("#login-email"),
  loginPassword: document.querySelector("#login-password"),
  signupEmail: document.querySelector("#signup-email"),
  signupPassword: document.querySelector("#signup-password"),
  signupPasswordConfirm: document.querySelector("#signup-password-confirm"),
  userEmail: document.querySelector("#user-email"),
  logoutButton: document.querySelector("#logout-button"),
  memoContent: document.querySelector("#memo-content"),
  characterCount: document.querySelector("#character-count"),
  updatedAt: document.querySelector("#updated-at"),
  saveState: document.querySelector("#save-state"),
  saveButton: document.querySelector("#save-button"),
  copyButton: document.querySelector("#copy-button"),
  clearButton: document.querySelector("#clear-button"),
  toast: document.querySelector("#toast"),
};

let auth;
let db;
let currentUser = null;
let memoChanged = false;
let toastTimer;

const configured = Object.values(firebaseConfig).every(
  (value) => value && !value.includes("YOUR_"),
);

function switchAuthMode(mode) {
  const isLogin = mode === "login";

  elements.loginTab.classList.toggle("active", isLogin);
  elements.signupTab.classList.toggle("active", !isLogin);
  elements.loginTab.setAttribute("aria-selected", String(isLogin));
  elements.signupTab.setAttribute("aria-selected", String(!isLogin));
  elements.loginForm.classList.toggle("hidden", !isLogin);
  elements.signupForm.classList.toggle("hidden", isLogin);
  elements.authTitle.textContent = isLogin
    ? "다시 만나서 반가워요"
    : "나만의 메모를 시작하세요";
  elements.authDescription.textContent = isLogin
    ? "저장한 메모를 확인하려면 로그인하세요."
    : "이메일과 비밀번호만 있으면 바로 시작할 수 있어요.";
  setAuthMessage("");
}

function setAuthMessage(message, type = "error") {
  elements.authMessage.textContent = message;
  elements.authMessage.classList.toggle("success", type === "success");
}

function setFormBusy(form, busy, busyText) {
  const controls = form.querySelectorAll("input, button");
  controls.forEach((control) => {
    control.disabled = busy;
  });

  const button = form.querySelector('button[type="submit"]');
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = busyText;
  } else if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
  }
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("visible");
  }, 2200);
}

function showAuthView() {
  currentUser = null;
  memoChanged = false;
  elements.memoView.classList.add("hidden");
  elements.authView.classList.remove("hidden");
  elements.loginPassword.value = "";
  elements.signupPassword.value = "";
  elements.signupPasswordConfirm.value = "";
  switchAuthMode("login");
}

function showMemoView(user) {
  currentUser = user;
  elements.userEmail.textContent = user.email ?? "로그인 사용자";
  elements.authView.classList.add("hidden");
  elements.memoView.classList.remove("hidden");
}

function updateCharacterCount() {
  elements.characterCount.textContent = `${elements.memoContent.value.length.toLocaleString("ko-KR")} / 20,000자`;
}

function setSaveState(label, type = "saved") {
  elements.saveState.classList.toggle("dirty", type === "dirty");
  elements.saveState.classList.toggle("error", type === "error");
  elements.saveState.querySelector("span:last-child").textContent = label;
}

function formatSavedTime(timestamp) {
  if (!timestamp?.toDate) {
    return "저장된 메모를 불러왔어요";
  }

  return `${timestamp.toDate().toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })} 저장`;
}

function friendlyAuthError(error) {
  const messages = {
    "auth/email-already-in-use": "이미 가입된 이메일입니다.",
    "auth/invalid-email": "이메일 형식을 확인해 주세요.",
    "auth/invalid-credential": "이메일 또는 비밀번호가 올바르지 않습니다.",
    "auth/missing-password": "비밀번호를 입력해 주세요.",
    "auth/too-many-requests": "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    "auth/unauthorized-domain": "Firebase 허용 도메인에 현재 주소를 추가해 주세요.",
    "auth/weak-password": "비밀번호는 6자 이상 입력해 주세요.",
  };

  return messages[error.code] ?? "처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

async function loadMemo(user) {
  elements.memoContent.disabled = true;
  elements.saveButton.disabled = true;
  setSaveState("불러오는 중", "dirty");

  try {
    const snapshot = await getDoc(doc(db, "memos", user.uid));
    if (currentUser?.uid !== user.uid) return;

    if (snapshot.exists()) {
      const data = snapshot.data();
      elements.memoContent.value = typeof data.content === "string" ? data.content : "";
      elements.updatedAt.textContent = formatSavedTime(data.updatedAt);
    } else {
      elements.memoContent.value = "";
      elements.updatedAt.textContent = "첫 메모를 작성해 보세요";
    }

    memoChanged = false;
    updateCharacterCount();
    setSaveState("저장됨");
  } catch (error) {
    console.error(error);
    setSaveState("불러오기 실패", "error");
    elements.updatedAt.textContent = "Firestore 연결과 보안 규칙을 확인해 주세요";
    showToast("메모를 불러오지 못했습니다.");
  } finally {
    elements.memoContent.disabled = false;
    elements.saveButton.disabled = false;
  }
}

async function saveMemo() {
  if (!currentUser) return;

  elements.saveButton.disabled = true;
  elements.saveButton.textContent = "저장 중...";
  setSaveState("저장 중", "dirty");

  try {
    await setDoc(doc(db, "memos", currentUser.uid), {
      content: elements.memoContent.value,
      updatedAt: serverTimestamp(),
    });

    memoChanged = false;
    setSaveState("저장됨");
    elements.updatedAt.textContent = `${new Date().toLocaleString("ko-KR", {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })} 저장`;
    showToast("메모를 안전하게 저장했습니다.");
  } catch (error) {
    console.error(error);
    setSaveState("저장 실패", "error");
    showToast("저장하지 못했습니다. 보안 규칙을 확인해 주세요.");
  } finally {
    elements.saveButton.disabled = false;
    elements.saveButton.textContent = "메모 저장";
  }
}

elements.loginTab.addEventListener("click", () => switchAuthMode("login"));
elements.signupTab.addEventListener("click", () => switchAuthMode("signup"));

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setAuthMessage("");

  if (!elements.loginForm.reportValidity()) return;

  setFormBusy(elements.loginForm, true, "로그인 중...");
  try {
    await signInWithEmailAndPassword(
      auth,
      elements.loginEmail.value.trim(),
      elements.loginPassword.value,
    );
  } catch (error) {
    setAuthMessage(friendlyAuthError(error));
  } finally {
    setFormBusy(elements.loginForm, false);
  }
});

elements.signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setAuthMessage("");

  if (!elements.signupForm.reportValidity()) return;
  if (elements.signupPassword.value !== elements.signupPasswordConfirm.value) {
    setAuthMessage("비밀번호 확인이 일치하지 않습니다.");
    elements.signupPasswordConfirm.focus();
    return;
  }

  setFormBusy(elements.signupForm, true, "계정 만드는 중...");
  try {
    await createUserWithEmailAndPassword(
      auth,
      elements.signupEmail.value.trim(),
      elements.signupPassword.value,
    );
    showToast("회원가입이 완료되었습니다.");
  } catch (error) {
    setAuthMessage(friendlyAuthError(error));
  } finally {
    setFormBusy(elements.signupForm, false);
  }
});

elements.logoutButton.addEventListener("click", async () => {
  if (memoChanged && !window.confirm("저장하지 않은 내용이 있습니다. 로그아웃할까요?")) {
    return;
  }

  elements.logoutButton.disabled = true;
  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
    showToast("로그아웃하지 못했습니다.");
  } finally {
    elements.logoutButton.disabled = false;
  }
});

elements.memoContent.addEventListener("input", () => {
  memoChanged = true;
  updateCharacterCount();
  setSaveState("저장 필요", "dirty");
});

elements.saveButton.addEventListener("click", saveMemo);

elements.copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(elements.memoContent.value);
    showToast("메모 내용을 복사했습니다.");
  } catch {
    elements.memoContent.focus();
    elements.memoContent.select();
    document.execCommand("copy");
    showToast("메모 내용을 복사했습니다.");
  }
});

elements.clearButton.addEventListener("click", async () => {
  if (!elements.memoContent.value) {
    showToast("지울 내용이 없습니다.");
    return;
  }

  if (!window.confirm("메모 내용을 모두 지울까요? 저장하면 복구할 수 없습니다.")) {
    return;
  }

  elements.memoContent.value = "";
  memoChanged = true;
  updateCharacterCount();
  await saveMemo();
});

window.addEventListener("beforeunload", (event) => {
  if (!memoChanged) return;
  event.preventDefault();
});

if (!configured) {
  elements.setupNotice.classList.remove("hidden");
  elements.loginForm.querySelectorAll("input, button").forEach((control) => {
    control.disabled = true;
  });
  elements.signupForm.querySelectorAll("input, button").forEach((control) => {
    control.disabled = true;
  });
  setAuthMessage("README.md 안내에 따라 Firebase 프로젝트를 먼저 연결해 주세요.");
} else {
  const firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);

  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    console.error("로그인 상태 저장 설정 실패", error);
  }

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      showMemoView(user);
      await loadMemo(user);
    } else {
      showAuthView();
    }
  });
}
