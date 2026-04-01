const BASE_URL = ""

// ===== UTILITY: HTML Escape =====
function escapeHtml(text) {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = "error") {
  const container = document.getElementById("toast-container")
  if (!container) return

  const bgColors = {
    error: "bg-red-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    info: "bg-primary-500"
  }
  const icons = { error: "X", success: "OK", info: "i", warning: "!" }

  const toast = document.createElement("div")
  toast.className = `flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm font-medium text-white shadow-2xl max-w-sm ${bgColors[type] || bgColors.info} toast-show`
  toast.innerHTML = `<span class="text-base">${icons[type] || ""}</span><span class="flex-1">${escapeHtml(message)}</span>`

  container.appendChild(toast)

  setTimeout(() => {
    toast.classList.remove("toast-show")
    toast.classList.add("toast-hide")
    toast.addEventListener("animationend", () => toast.remove())
  }, 3500)
}

// ===== AUTH GUARD =====
function checkAuth() {
  const userId = localStorage.getItem("userId")
  const path = window.location.pathname

  if (path.includes("login.html") || path.includes("signup.html")) return

  if (!userId) {
    const isInPages = path.includes("/pages/")
    window.location.href = isInPages ? "signup.html" : "./pages/signup.html"
  }
}

checkAuth()

// ===== NAVBAR =====
function renderNavbar() {
  const nav = document.getElementById("navbar")
  if (!nav) return

  const userId = localStorage.getItem("userId")
  const userName = localStorage.getItem("userName")
  const isInPages = window.location.pathname.includes("/pages/")
  const homePath = isInPages ? "../index.html" : "index.html"
  const loginPath = isInPages ? "login.html" : "./pages/login.html"
  const signupPath = isInPages ? "signup.html" : "./pages/signup.html"

  if (userId) {
    nav.innerHTML = `
      <a href="${homePath}" class="text-lg font-bold text-white hover:text-primary-300 transition no-underline flex items-center gap-2">
        &#128218; <span class="hidden sm:inline">MCQ App</span>
      </a>
      <div class="flex items-center gap-3">
        <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg">
          <span class="text-sm">&#128100;</span>
          <span class="text-sm font-medium text-slate-200 max-w-[120px] truncate">${escapeHtml(userName || "User")}</span>
        </div>
        <button onclick="logout()"
          class="px-4 py-2 text-sm font-semibold text-red-400 border border-red-400/30 bg-red-400/10 rounded-lg hover:bg-red-400/20 transition">
          Logout
        </button>
      </div>
    `
  } else {
    nav.innerHTML = `
      <a href="${homePath}" class="text-lg font-bold text-white hover:text-primary-300 transition no-underline flex items-center gap-2">
        &#128218; <span class="hidden sm:inline">MCQ App</span>
      </a>
      <div class="flex items-center gap-2.5">
        <a href="${loginPath}" class="px-4 py-2 text-sm font-semibold text-white border border-white/20 rounded-lg hover:bg-white/10 transition no-underline">Login</a>
        <a href="${signupPath}" class="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-indigo-600 rounded-lg hover:shadow-lg hover:shadow-primary-500/25 transition no-underline">Sign Up</a>
      </div>
    `
  }
}

function logout() {
  localStorage.removeItem("userId")
  localStorage.removeItem("userName")
  localStorage.removeItem("chapterId")
  localStorage.removeItem("result")

  const isInPages = window.location.pathname.includes("/pages/")
  window.location.href = isInPages ? "login.html" : "./pages/login.html"
}

renderNavbar()

// ===== GOOGLE SIGN-IN =====
async function googleSignIn() {
  // Initialize Google Identity Services
  if (typeof google === "undefined" || !google.accounts) {
    showToast("Google Sign-In is loading. Please try again in a moment.", "info")
    return
  }

  try {
    // Fetch Client ID from the backend
    const configRes = await fetch(`${BASE_URL}/config/google-client-id`)
    const configData = await configRes.json()

    if (!configRes.ok || !configData.clientId) {
      showToast("Google Sign-In is not configured.", "error")
      return
    }

    google.accounts.id.initialize({
      client_id: configData.clientId,
      callback: handleGoogleCallback,
      use_fedcm_for_prompt: true
    })

    // Create a popup overlay with a rendered Google button
    const overlay = document.createElement("div")
    overlay.id = "google-signin-overlay"
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);"

    const popup = document.createElement("div")
    popup.style.cssText = "background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px;text-align:center;min-width:300px;box-shadow:0 25px 50px rgba(0,0,0,0.5);"

    const title = document.createElement("p")
    title.textContent = "Sign in with Google"
    title.style.cssText = "color:#fff;font-size:1.1rem;font-weight:600;margin-bottom:20px;"
    popup.appendChild(title)

    const btnContainer = document.createElement("div")
    btnContainer.style.cssText = "display:flex;justify-content:center;"
    popup.appendChild(btnContainer)

    const cancelBtn = document.createElement("button")
    cancelBtn.textContent = "Cancel"
    cancelBtn.style.cssText = "margin-top:16px;padding:8px 24px;background:transparent;border:1px solid rgba(255,255,255,0.2);border-radius:8px;color:#94a3b8;font-size:0.85rem;cursor:pointer;"
    cancelBtn.onclick = () => overlay.remove()
    popup.appendChild(cancelBtn)

    overlay.appendChild(popup)
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove() }
    document.body.appendChild(overlay)

    // Render the official Google button inside the popup
    google.accounts.id.renderButton(btnContainer, {
      theme: "outline",
      size: "large",
      width: 250,
      text: "signin_with"
    })

  } catch (err) {
    showToast("Failed to initialize Google Sign-In.", "error")
  }
}

async function handleGoogleCallback(response) {
  try {
    const res = await fetch(`${BASE_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential })
    })

    const data = await res.json()

    if (!res.ok) {
      showToast(data.error || "Google sign-in failed", "error")
      return
    }

    localStorage.setItem("userId", data._id)
    localStorage.setItem("userName", data.name || "User")
    showToast("Signed in with Google!", "success")

    const isInPages = window.location.pathname.includes("/pages/")
    setTimeout(() => (window.location.href = isInPages ? "../index.html" : "index.html"), 500)
  } catch (err) {
    showToast("Network error. Please try again.", "error")
  }
}

// ===== AUTH =====
async function handleLogin(event) {
  event.preventDefault()

  const email = document.getElementById("email").value.trim()
  const password = document.getElementById("password").value
  const btn = document.getElementById("login-btn")

  if (!email || !password) {
    showToast("Please fill in all fields", "warning")
    return
  }

  btn.disabled = true
  btn.textContent = "Logging in..."

  try {
    const res = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    })

    const data = await res.json()

    if (!res.ok) {
      showToast(data.error || "Login failed", "error")
      btn.disabled = false
      btn.textContent = "Login"
      return
    }

    localStorage.setItem("userId", data._id)
    localStorage.setItem("userName", data.name || "User")
    showToast("Login successful!", "success")
    setTimeout(() => (window.location.href = "../index.html"), 500)
  } catch (err) {
    showToast("Network error. Please try again.", "error")
    btn.disabled = false
    btn.textContent = "Login"
  }
}

async function handleSignup(event) {
  event.preventDefault()

  const name = document.getElementById("name").value.trim()
  const email = document.getElementById("email").value.trim()
  const password = document.getElementById("password").value
  const btn = document.getElementById("signup-btn")

  if (!name || !email || !password) {
    showToast("Please fill in all fields", "warning")
    return
  }

  if (password.length < 6) {
    showToast("Password must be at least 6 characters", "warning")
    return
  }

  btn.disabled = true
  btn.textContent = "Signing up..."

  try {
    const res = await fetch(`${BASE_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    })

    const data = await res.json()

    if (!res.ok) {
      showToast(data.error || "Signup failed", "error")
      btn.disabled = false
      btn.textContent = "Sign Up"
      return
    }

    localStorage.setItem("userId", data._id)
    localStorage.setItem("userName", data.name || name)
    showToast("Account created!", "success")
    setTimeout(() => (window.location.href = "../index.html"), 500)
  } catch (err) {
    showToast("Network error. Please try again.", "error")
    btn.disabled = false
    btn.textContent = "Sign Up"
  }
}

// ===== CHAPTERS =====
async function loadChapters() {
  const container = document.getElementById("chapters")
  if (!container) return

  try {
    const res = await fetch(`${BASE_URL}/chapters`)
    const data = await res.json()

    // Remove loader
    const loader = document.getElementById("chapters-loader")
    if (loader) loader.remove()

    if (!data.length) {
      container.innerHTML = `
        <div class="text-center py-16">
          <p class="text-4xl mb-3">&#128237;</p>
          <p class="text-slate-300 text-lg font-medium">No chapters available yet.</p>
          <p class="text-slate-500 text-sm mt-1">Check back later!</p>
        </div>
      `
      return
    }

    data.forEach((ch, idx) => {
      const div = document.createElement("div")
      div.className = "group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/10 hover:border-primary-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-500/5 cursor-pointer"
      div.style.animationDelay = `${idx * 60}ms`

      div.innerHTML = `
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-3 mb-1.5">
            <span class="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500/20 to-indigo-500/20 text-primary-300 text-sm font-bold border border-primary-500/20">
              ${ch.chapterNumber || idx + 1}
            </span>
            <h3 class="text-base sm:text-lg font-bold text-white group-hover:text-primary-200 transition truncate">${escapeHtml(ch.title)}</h3>
          </div>
          ${ch.description ? `<p class="text-sm text-slate-400 ml-12 mb-2 line-clamp-2">${escapeHtml(ch.description)}</p>` : ""}
          <span class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-white/5 px-3 py-1 rounded-full ml-12">
            <span></span> ${ch.mcqs ? ch.mcqs.length : 0} questions
          </span>
        </div>
        <button onclick="startQuiz('${ch._id}')"
          class="px-6 py-2.5 bg-gradient-to-r from-primary-500 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-200 text-sm whitespace-nowrap flex-shrink-0">
          Start Quiz
        </button>
      `
      container.appendChild(div)
    })

    // Check if user has wrong answers for revision
    checkRevisionAvailable()

  } catch (err) {
    const loader = document.getElementById("chapters-loader")
    if (loader) loader.remove()

    container.innerHTML = `
      <div class="text-center py-16">
        <p class="text-4xl mb-3">&#128543;</p>
        <p class="text-slate-300 text-lg font-medium">Failed to load chapters.</p>
        <button onclick="location.reload()"
          class="mt-4 px-6 py-2.5 bg-white/10 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/15 transition text-sm">
          &#128260; Retry
        </button>
      </div>
    `
  }
}

async function checkRevisionAvailable() {
  const userId = localStorage.getItem("userId")
  if (!userId) return

  try {
    const res = await fetch(`${BASE_URL}/revision-mcqs/${userId}`)
    const data = await res.json()

    if (data && data.length > 0) {
      const banner = document.getElementById("revision-banner")
      if (banner) banner.classList.remove("hidden")
    }
  } catch (err) {
    // silently ignore - revision is optional
  }
}

function startQuiz(chapterId) {
  localStorage.setItem("chapterId", chapterId)
  window.location.href = "./pages/quiz.html"
}

function startRevision() {
  window.location.href = "./pages/revision.html"
}

if (window.location.pathname.includes("index.html") || window.location.pathname.endsWith("/")) {
  loadChapters()
}

// ===== QUIZ =====
let answers = []
let quizMcqs = []
let currentQuestionIndex = 0
let isRevisionMode = window.location.pathname.includes("revision.html")
let questionElements = []

function updateProgress() {
  const countEl = document.getElementById("progress-count")
  const barEl = document.getElementById("progress-bar")
  const totalEl = document.getElementById("progress-total")

  if (!countEl || !barEl || !totalEl) return

  const total = quizMcqs.length
  const answered = answers.length
  countEl.textContent = answered
  totalEl.textContent = total
  barEl.style.width = total > 0 ? `${(answered / total) * 100}%` : "0%"

  // Update question dots
  updateDots()

  // Show submit bar when all answered
  const submitBar = document.getElementById("submit-bar")
  const navBar = document.getElementById("quiz-nav")
  if (answered === total && total > 0) {
    if (submitBar) submitBar.classList.remove("hidden")
    if (navBar) navBar.classList.add("hidden")
  } else {
    if (submitBar) submitBar.classList.add("hidden")
    if (navBar) navBar.classList.remove("hidden")
  }
}

function updateDots() {
  const dotsContainer = document.getElementById("question-dots")
  if (!dotsContainer) return

  dotsContainer.innerHTML = ""
  quizMcqs.forEach((q, i) => {
    const dot = document.createElement("button")
    dot.onclick = () => goToQuestion(i)

    const isAnswered = answers.some(a => a.questionId === q._id)
    const isCurrent = i === currentQuestionIndex

    let classes = "w-7 h-7 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center "

    if (isCurrent) {
      classes += isRevisionMode
        ? "bg-amber-500 text-white scale-110 shadow-lg shadow-amber-500/30"
        : "bg-primary-500 text-white scale-110 shadow-lg shadow-primary-500/30"
    } else if (isAnswered) {
      classes += "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
    } else {
      classes += "bg-white/5 text-slate-500 border border-white/10 hover:bg-white/10 hover:text-slate-300"
    }

    dot.className = classes
    dot.textContent = i + 1
    dotsContainer.appendChild(dot)
  })
}

function renderQuestion(q, index, total) {
  const div = document.createElement("div")
  div.id = `question-${index}`
  div.className = "w-full max-w-2xl mx-auto"
  div.style.display = index === 0 ? "block" : "none"

  const optionLetters = ["A", "B", "C", "D"]

  div.innerHTML = `
    <div class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 md:p-10">
      <div class="flex items-center justify-between mb-6">
        <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Question ${index + 1} of ${total}</span>
        <span class="text-xs font-medium text-primary-400 bg-primary-500/10 px-3 py-1.5 rounded-full">${index + 1}/${total}</span>
      </div>
      <p class="text-lg sm:text-xl font-semibold text-white leading-relaxed mb-8">${escapeHtml(q.question)}</p>
      <div class="space-y-3">
        ${q.options.map((opt, i) => `
          <label id="q${index}-opt${i}"
            class="group/opt flex items-center gap-4 p-4 sm:p-5 rounded-xl border-2 border-white/10 bg-white/[0.03] cursor-pointer
                   hover:border-primary-500/40 hover:bg-primary-500/5 transition-all duration-200 option-focus">
            <span class="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 border border-white/10 text-sm font-bold text-slate-400
                         group-hover/opt:border-primary-500/30 group-hover/opt:text-primary-300 transition flex-shrink-0">
              ${optionLetters[i]}
            </span>
            <input type="radio" name="q${index}" class="hidden"
              onclick="selectAnswer(${index}, '${q._id}', ${i}, ${q.correctOption})">
            <span class="text-sm sm:text-base text-slate-300 group-hover/opt:text-white transition flex-1">${escapeHtml(opt)}</span>
          </label>
        `).join("")}
      </div>
    </div>
  `

  return div
}

function showQuestion(index) {
  if (index < 0 || index >= quizMcqs.length) return

  // Hide current question
  if (questionElements[currentQuestionIndex]) {
    questionElements[currentQuestionIndex].style.display = "none"
  }

  currentQuestionIndex = index

  // Show new question with animation
  const el = questionElements[currentQuestionIndex]
  if (el) {
    el.style.display = "block"
    el.style.opacity = "0"
    el.style.transform = "translateX(20px)"
    requestAnimationFrame(() => {
      el.style.transition = "opacity 0.35s ease, transform 0.35s ease"
      el.style.opacity = "1"
      el.style.transform = "translateX(0)"
    })
  }

  // Update labels
  const labelEl = document.getElementById("question-label")
  if (labelEl) labelEl.textContent = `Question ${index + 1} of ${quizMcqs.length}`

  const counterEl = document.getElementById("nav-counter")
  if (counterEl) counterEl.textContent = `${index + 1} / ${quizMcqs.length}`

  // Update nav buttons
  const prevBtn = document.getElementById("prev-btn")
  const nextBtn = document.getElementById("next-btn")
  if (prevBtn) prevBtn.disabled = index === 0
  if (nextBtn) {
    if (index === quizMcqs.length - 1) {
      nextBtn.innerHTML = `Finish <span>\u2713</span>`
    } else {
      nextBtn.innerHTML = `Next <span>\u2192</span>`
    }
  }

  updateDots()
}

function goToQuestion(index) {
  showQuestion(index)
}

function prevQuestion() {
  if (currentQuestionIndex > 0) showQuestion(currentQuestionIndex - 1)
}

function nextQuestion() {
  if (currentQuestionIndex < quizMcqs.length - 1) {
    showQuestion(currentQuestionIndex + 1)
  } else if (isRevisionMode) {
    // In revision mode, show the submit bar with "Back to Chapters"
    const navBar = document.getElementById("quiz-nav")
    const submitBar = document.getElementById("submit-bar")
    if (navBar) navBar.classList.add("hidden")
    if (submitBar) submitBar.classList.remove("hidden")
  } else {
    // Regular quiz - submit if all answered
    if (answers.length === quizMcqs.length) {
      submitTest()
    } else {
      const remaining = quizMcqs.length - answers.length
      showToast(`${remaining} question${remaining > 1 ? 's' : ''} still unanswered`, "warning")
    }
  }
}

async function loadQuiz() {
  const chapterId = localStorage.getItem("chapterId")
  const container = document.getElementById("quiz")
  const headerEl = document.getElementById("quiz-header")
  const navEl = document.getElementById("quiz-nav")

  if (!chapterId) {
    showToast("No chapter selected. Redirecting...", "warning")
    setTimeout(() => (window.location.href = "../index.html"), 1000)
    return
  }

  try {
    const res = await fetch(`${BASE_URL}/quiz/${chapterId}`)

    if (!res.ok) throw new Error("Failed to fetch quiz")

    const data = await res.json()
    quizMcqs = data

    // Remove loader
    const loader = document.getElementById("quiz-loader")
    if (loader) loader.remove()

    if (!data.length) {
      container.innerHTML = `
        <div class="text-center py-16">
          <p class="text-4xl mb-3">&#128237;</p>
          <p class="text-slate-300 text-lg font-medium">No questions in this chapter yet.</p>
          <button onclick="window.location.href='../index.html'"
            class="mt-4 px-6 py-2.5 bg-white/10 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/15 transition text-sm">
            &#127968; Back to Chapters
          </button>
        </div>
      `
      return
    }

    // Show header and nav
    if (headerEl) headerEl.classList.remove("hidden")
    if (navEl) navEl.classList.remove("hidden")

    // Render all questions (hidden except first)
    questionElements = []
    data.forEach((q, index) => {
      const el = renderQuestion(q, index, data.length)
      questionElements.push(el)
      container.appendChild(el)
    })

    updateProgress()
    showQuestion(0)

    // Keyboard navigation
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault()
        nextQuestion()
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault()
        prevQuestion()
      }
    })

  } catch (err) {
    const loader = document.getElementById("quiz-loader")
    if (loader) loader.remove()

    container.innerHTML = `
      <div class="text-center py-16">
        <p class="text-4xl mb-3">&#128237;</p>
        <p class="text-slate-300 text-lg font-medium">Failed to load quiz.</p>
        <button onclick="location.reload()"
          class="mt-4 px-6 py-2.5 bg-white/10 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/15 transition text-sm">
          &#128260; Retry
        </button>
      </div>
    `
  }
}

function selectAnswer(questionIndex, questionId, selectedOption, correctOption) {
  const existing = answers.find(a => a.questionId === questionId)
  if (existing) return // Already answered

  answers.push({ questionId, selectedOption })

  const questionCard = document.getElementById(`question-${questionIndex}`)
  const labels = questionCard.querySelectorAll("label")
  const isCorrect = selectedOption === correctOption

  labels.forEach((label, i) => {
    label.classList.add("pointer-events-none")
    const radio = label.querySelector("input[type='radio']")
    if (radio) radio.disabled = true

    // Dim all non-selected options
    if (i !== selectedOption) {
      label.classList.add("opacity-40")
    }
  })

  // Highlight the selected option only
  const selectedLabel = document.getElementById(`q${questionIndex}-opt${selectedOption}`)
  if (selectedLabel) {
    selectedLabel.classList.remove("border-white/10", "bg-white/[0.03]")

    if (isCorrect) {
      // Green for correct
      selectedLabel.classList.add("border-emerald-500/50", "bg-emerald-500/10")
      const letterBadge = selectedLabel.querySelector("span:first-child")
      if (letterBadge) {
        letterBadge.classList.remove("bg-white/5", "border-white/10", "text-slate-400")
        letterBadge.classList.add("bg-emerald-500", "border-emerald-500", "text-white")
      }
      const textSpan = selectedLabel.querySelector("span:last-child")
      if (textSpan) textSpan.classList.add("text-emerald-200", "font-semibold")

      const icon = document.createElement("span")
      icon.className = "text-emerald-400 text-lg flex-shrink-0"
      icon.textContent = "\u2713"
      selectedLabel.appendChild(icon)
    } else {
      // Red for wrong
      selectedLabel.classList.add("border-red-500/50", "bg-red-500/10")
      const letterBadge = selectedLabel.querySelector("span:first-child")
      if (letterBadge) {
        letterBadge.classList.remove("bg-white/5", "border-white/10", "text-slate-400")
        letterBadge.classList.add("bg-red-500", "border-red-500", "text-white")
      }
      const textSpan = selectedLabel.querySelector("span:last-child")
      if (textSpan) textSpan.classList.add("text-red-200")

      const icon = document.createElement("span")
      icon.className = "text-red-400 text-lg flex-shrink-0"
      icon.textContent = "\u2717"
      selectedLabel.appendChild(icon)
    }
  }

  updateProgress()

  // In revision mode, remove correctly answered MCQs from the revision list
  if (isRevisionMode && isCorrect) {
    const userId = localStorage.getItem("userId")
    if (userId) {
      fetch(`${BASE_URL}/revision-mcqs/${userId}/${questionId}`, { method: "DELETE" })
        .catch(() => {}) // silently ignore errors
    }
  }

  // Auto-advance to next question after feedback delay
  if (questionIndex < quizMcqs.length - 1) {
    setTimeout(() => showQuestion(questionIndex + 1), 1200)
  }
}

if (window.location.pathname.includes("quiz.html")) {
  loadQuiz()
}


// ===== REVISION QUIZ =====
async function loadRevisionQuiz() {
  const userId = localStorage.getItem("userId")
  const container = document.getElementById("quiz")
  const headerEl = document.getElementById("quiz-header")
  const navEl = document.getElementById("quiz-nav")

  if (!userId) {
    showToast("Please login first. Redirecting...", "warning")
    setTimeout(() => (window.location.href = "login.html"), 1000)
    return
  }

  try {
    const res = await fetch(`${BASE_URL}/revision-mcqs/${userId}`)

    if (!res.ok) throw new Error("Failed to fetch revision MCQs")

    const data = await res.json()
    quizMcqs = data

    // Remove loader
    const loader = document.getElementById("quiz-loader")
    if (loader) loader.remove()

    if (!data.length) {
      container.innerHTML = `
        <div class="text-center py-16">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
            <span class="text-3xl">&#127881;</span>
          </div>
          <p class="text-slate-200 text-lg font-semibold mb-1">No difficult MCQs to revise!</p>
          <p class="text-slate-400 text-sm">You haven't gotten any questions wrong yet. Great job!</p>
          <button onclick="window.location.href='../index.html'"
            class="mt-6 px-6 py-2.5 bg-gradient-to-r from-primary-500 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-200 text-sm">
            &#127968; Back to Chapters
          </button>
        </div>
      `
      return
    }

    // Show header and nav
    if (headerEl) headerEl.classList.remove("hidden")
    if (navEl) navEl.classList.remove("hidden")

    // Render all questions (hidden except first)
    questionElements = []
    data.forEach((q, index) => {
      const el = renderQuestion(q, index, data.length)
      questionElements.push(el)
      container.appendChild(el)
    })

    updateProgress()
    showQuestion(0)

    // Keyboard navigation
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault()
        nextQuestion()
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault()
        prevQuestion()
      }
    })

  } catch (err) {
    const loader = document.getElementById("quiz-loader")
    if (loader) loader.remove()

    container.innerHTML = `
      <div class="text-center py-16">
        <p class="text-4xl mb-3">&#128543;</p>
        <p class="text-slate-300 text-lg font-medium">Failed to load revision questions.</p>
        <button onclick="location.reload()"
          class="mt-4 px-6 py-2.5 bg-white/10 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/15 transition text-sm">
          &#128260; Retry
        </button>
      </div>
    `
  }
}

if (window.location.pathname.includes("revision.html")) {
  loadRevisionQuiz()
}

// ===== EXIT QUIZ =====
function exitQuiz() {
  const isInPages = window.location.pathname.includes("/pages/")
  window.location.href = isInPages ? "../index.html" : "index.html"
}

// ===== SUBMIT =====
async function submitTest() {
  const userId = localStorage.getItem("userId")
  const chapterId = localStorage.getItem("chapterId")
  const btn = document.getElementById("submit-btn")

  if (answers.length === 0) {
    showToast("Answer at least one question before submitting", "warning")
    return
  }

  btn.disabled = true
  btn.textContent = "Submitting..."

  try {
    const res = await fetch(`${BASE_URL}/submit-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: userId,
        chapter: chapterId,
        answers: answers
      })
    })

    const data = await res.json()

    if (!res.ok) {
      showToast(data.error || "Failed to submit test", "error")
      btn.disabled = false
      btn.textContent = "Submit Test"
      return
    }

    localStorage.setItem("result", JSON.stringify(data))
    window.location.href = "result.html"
  } catch (err) {
    showToast("Network error. Please try again.", "error")
    btn.disabled = false
    btn.textContent = "Submit Test"
  }
}

// ===== RESULT =====
function loadResult() {
  const raw = localStorage.getItem("result")
  const div = document.getElementById("result")

  if (!raw || !div) {
    showToast("No result data found. Redirecting...", "warning")
    setTimeout(() => (window.location.href = "../index.html"), 1000)
    return
  }

  const data = JSON.parse(raw)

  // Determine grade
  let gradeColor, gradeBg, gradeText, gradeEmoji
  if (data.score >= 80) {
    gradeColor = "text-emerald-400"
    gradeBg = "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20"
    gradeText = "Excellent!"
    gradeEmoji = "&#128077;"
  } else if (data.score >= 50) {
    gradeColor = "text-amber-400"
    gradeBg = "from-amber-500/20 to-amber-500/5 border-amber-500/20"
    gradeText = "Good Work!"
    gradeEmoji = "&#128077;"
  } else {
    gradeColor = "text-red-400"
    gradeBg = "from-red-500/20 to-red-500/5 border-red-500/20"
    gradeText = "Keep Practicing"
    gradeEmoji = "&#128077;"
  }

  div.innerHTML = `
    <!-- Score Circle -->
    <div class="bg-gradient-to-b ${gradeBg} border rounded-3xl p-8 mb-6">
      <div class="score-circle bg-white/5 border-4 ${gradeColor.replace("text-", "border-")}">
        <span class="text-4xl font-extrabold ${gradeColor}">${data.score}%</span>
        <span class="text-xs text-slate-400 font-medium mt-1">Score</span>
      </div>
      <p class="text-xl font-bold mt-4 ${gradeColor}">${gradeEmoji} ${gradeText}</p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-3 gap-3 mb-6">
      <div class="bg-white/5 border border-white/10 rounded-2xl p-4">
        <p class="text-2xl font-bold text-emerald-400">${data.correct}</p>
        <p class="text-xs text-slate-400 mt-1">Correct</p>
      </div>
      <div class="bg-white/5 border border-white/10 rounded-2xl p-4">
        <p class="text-2xl font-bold text-red-400">${data.wrong}</p>
        <p class="text-xs text-slate-400 mt-1">Wrong</p>
      </div>
      <div class="bg-white/5 border border-white/10 rounded-2xl p-4">
        <p class="text-2xl font-bold text-primary-400">${data.attempted}</p>
        <p class="text-xs text-slate-400 mt-1">Attempted</p>
      </div>
    </div>

    <p class="text-sm text-slate-400 mb-6">
      Attempted <strong class="text-slate-200">${data.attempted}</strong> of <strong class="text-slate-200">${data.totalQuestions}</strong> questions
    </p>

    <!-- Actions -->
    <div class="flex flex-col sm:flex-row gap-3">
      <button onclick="retakeTest()"
        class="flex-1 py-3 bg-gradient-to-r from-primary-500 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-200 hover:-translate-y-0.5 text-sm">
        &#128260; Retake Test
      </button>
      ${data.wrong > 0 ? `
      <button onclick="goToRevision()"
        class="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-200 hover:-translate-y-0.5 text-sm">
        &#128257; Revise Difficult MCQs
      </button>
      ` : ""}
      <button onclick="goHome()"
        class="flex-1 py-3 bg-white/10 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/15 transition-all duration-200 text-sm">
        &#127968; Home
      </button>
    </div>
  `
}

function retakeTest() {
  localStorage.removeItem("result")
  window.location.href = "quiz.html"
}

function goToRevision() {
  localStorage.removeItem("result")
  window.location.href = "revision.html"
}

function goHome() {
  localStorage.removeItem("result")
  window.location.href = "../index.html"
}

if (window.location.pathname.includes("result.html")) {
  loadResult()
}
