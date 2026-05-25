const storageKey = "afterSchoolPoints.v1";

const defaultClasses = ["一班", "二班"];
const defaultStudents = ["王小明", "林品妤", "陳柏翰"];
const rewardReasons = ["準時完成", "主動幫忙", "作業訂正", "上課專心", "進步明顯"];
const penaltyReasons = ["未完成作業", "吵鬧", "忘帶用品", "態度不佳", "遲到"];

const state = loadState();

let selectedMode = "reward";
let selectedPoints = 1;
let selectedClassId = state.selectedClassId;
let toastTimer;

const els = {
  classSelect: document.querySelector("#classSelect"),
  classForm: document.querySelector("#classForm"),
  className: document.querySelector("#className"),
  studentSelect: document.querySelector("#studentSelect"),
  studentForm: document.querySelector("#studentForm"),
  studentName: document.querySelector("#studentName"),
  rewardMode: document.querySelector("#rewardMode"),
  penaltyMode: document.querySelector("#penaltyMode"),
  minusPoint: document.querySelector("#minusPoint"),
  plusPoint: document.querySelector("#plusPoint"),
  pointValue: document.querySelector("#pointValue"),
  quickReasons: document.querySelector("#quickReasons"),
  reasonInput: document.querySelector("#reasonInput"),
  saveEntry: document.querySelector("#saveEntry"),
  studentList: document.querySelector("#studentList"),
  historyList: document.querySelector("#historyList"),
  todayReward: document.querySelector("#todayReward"),
  todayPenalty: document.querySelector("#todayPenalty"),
  monthNet: document.querySelector("#monthNet"),
  undoBtn: document.querySelector("#undoBtn"),
  clearAllBtn: document.querySelector("#clearAllBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  toast: document.querySelector("#toast"),
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      return migrateState(JSON.parse(saved));
    } catch (error) {
      console.warn("Saved points data could not be parsed.", error);
    }
  }

  const classes = defaultClasses.map((name, index) => ({
    id: createId(`class-${index}`),
    name,
  }));

  return {
    classes,
    selectedClassId: classes[0].id,
    students: defaultStudents.map((name, index) => ({
      id: createId(`student-${index}`),
      name,
      classId: classes[0].id,
    })),
    entries: [],
  };
}

function migrateState(savedState) {
  const classes =
    Array.isArray(savedState.classes) && savedState.classes.length
      ? savedState.classes
      : [{ id: createId("class"), name: "預設班" }];
  const fallbackClassId = savedState.selectedClassId || classes[0].id;
  const students = Array.isArray(savedState.students)
    ? savedState.students.map((student) => ({
        ...student,
        classId: student.classId || fallbackClassId,
      }))
    : [];
  const entries = Array.isArray(savedState.entries)
    ? savedState.entries.map((entry) => ({
        ...entry,
        classId: entry.classId || students.find((student) => student.id === entry.studentId)?.classId || fallbackClassId,
      }))
    : [];

  return {
    classes,
    selectedClassId: classes.some((classItem) => classItem.id === fallbackClassId) ? fallbackClassId : classes[0].id,
    students,
    entries,
  };
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function createId(prefix) {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function localDateKey(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function localMonthKey(date = new Date()) {
  return localDateKey(date).slice(0, 7);
}

function formatTime(dateText) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateText));
}

function studentNameById(studentId) {
  return state.students.find((student) => student.id === studentId)?.name || "已刪除學生";
}

function classNameById(classId) {
  return state.classes.find((classItem) => classItem.id === classId)?.name || "已刪除班級";
}

function signedPoints(entry) {
  return entry.mode === "reward" ? entry.points : -entry.points;
}

function studentsInSelectedClass() {
  return state.students.filter((student) => student.classId === selectedClassId);
}

function entriesInSelectedClass() {
  return state.entries.filter((entry) => entry.classId === selectedClassId);
}

function totalForStudent(studentId) {
  return state.entries
    .filter((entry) => entry.studentId === studentId)
    .reduce((sum, entry) => sum + signedPoints(entry), 0);
}

function setMode(mode) {
  selectedMode = mode;
  els.rewardMode.classList.toggle("is-active", mode === "reward");
  els.penaltyMode.classList.toggle("is-active", mode === "penalty");
  els.saveEntry.classList.toggle("is-penalty", mode === "penalty");
  els.saveEntry.textContent = mode === "reward" ? "登錄獎勵點數" : "登錄懲罰點數";
  renderQuickReasons();
}

function setPoints(points) {
  selectedPoints = Math.max(1, Math.min(20, points));
  els.pointValue.textContent = selectedPoints;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 1800);
}

function renderClassOptions() {
  const previousClassId = selectedClassId || state.classes[0]?.id;
  els.classSelect.innerHTML = "";

  state.classes.forEach((classItem) => {
    const option = document.createElement("option");
    option.value = classItem.id;
    option.textContent = classItem.name;
    els.classSelect.append(option);
  });

  selectedClassId = state.classes.some((classItem) => classItem.id === previousClassId)
    ? previousClassId
    : state.classes[0]?.id;
  state.selectedClassId = selectedClassId;
  els.classSelect.value = selectedClassId || "";
}

function renderStudentOptions() {
  const selectedId = els.studentSelect.value || studentsInSelectedClass()[0]?.id;
  const students = studentsInSelectedClass();
  els.studentSelect.innerHTML = "";

  students.forEach((student) => {
    const option = document.createElement("option");
    option.value = student.id;
    option.textContent = student.name;
    els.studentSelect.append(option);
  });

  if (students.some((student) => student.id === selectedId)) {
    els.studentSelect.value = selectedId;
  }
}

function renderQuickReasons() {
  const reasons = selectedMode === "reward" ? rewardReasons : penaltyReasons;
  els.quickReasons.innerHTML = "";

  reasons.forEach((reason) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = reason;
    button.addEventListener("click", () => {
      els.reasonInput.value = reason;
      els.reasonInput.focus();
    });
    els.quickReasons.append(button);
  });
}

function renderSummary() {
  const today = localDateKey();
  const month = localMonthKey();
  let todayReward = 0;
  let todayPenalty = 0;
  let monthNet = 0;

  entriesInSelectedClass().forEach((entry) => {
    const entryDate = localDateKey(new Date(entry.createdAt));
    const entryMonth = localMonthKey(new Date(entry.createdAt));
    if (entryDate === today && entry.mode === "reward") todayReward += entry.points;
    if (entryDate === today && entry.mode === "penalty") todayPenalty += entry.points;
    if (entryMonth === month) monthNet += signedPoints(entry);
  });

  els.todayReward.textContent = todayReward;
  els.todayPenalty.textContent = todayPenalty;
  els.monthNet.textContent = monthNet;
}

function renderStudentList() {
  els.studentList.innerHTML = "";

  const students = studentsInSelectedClass();

  if (!students.length) {
    els.studentList.innerHTML = '<p class="empty-state">先新增學生，就可以開始登錄點數。</p>';
    return;
  }

  [...students]
    .sort((a, b) => totalForStudent(b.id) - totalForStudent(a.id))
    .forEach((student) => {
      const total = totalForStudent(student.id);
      const card = document.createElement("article");
      card.className = "student-card";
      card.innerHTML = `
        <div>
          <strong>${student.name}</strong>
          <span>累積淨分</span>
        </div>
        <div class="score ${total >= 0 ? "positive" : "negative"}">${total}</div>
      `;
      card.addEventListener("click", () => {
        els.studentSelect.value = student.id;
        showToast(`已選擇 ${student.name}`);
      });
      els.studentList.append(card);
    });
}

function renderHistory() {
  els.historyList.innerHTML = "";

  const entries = entriesInSelectedClass();

  if (!entries.length) {
    els.historyList.innerHTML = '<p class="empty-state">尚未有紀錄。</p>';
    return;
  }

  entries
    .slice()
    .reverse()
    .slice(0, 12)
    .forEach((entry) => {
      const item = document.createElement("article");
      const isReward = entry.mode === "reward";
      item.className = "history-item";
      item.innerHTML = `
        <div class="badge ${entry.mode}">${isReward ? "+" : "-"}${entry.points}</div>
        <div>
          <strong>${studentNameById(entry.studentId)}</strong>
          <span>${formatTime(entry.createdAt)} · ${entry.reason || "未填原因"}</span>
        </div>
      `;
      els.historyList.append(item);
    });
}

function renderAll() {
  renderClassOptions();
  renderStudentOptions();
  renderSummary();
  renderStudentList();
  renderHistory();
}

function addClass(name) {
  const trimmedName = name.trim();
  if (!trimmedName) return;

  const classItem = {
    id: createId("class"),
    name: trimmedName,
  };
  state.classes.push(classItem);
  selectedClassId = classItem.id;
  state.selectedClassId = selectedClassId;
  saveState();
  renderAll();
  els.className.value = "";
  showToast(`已新增 ${trimmedName}`);
}

function addStudent(name) {
  const trimmedName = name.trim();
  if (!trimmedName) return;
  if (!selectedClassId) {
    showToast("請先新增班級");
    return;
  }

  const student = {
    id: createId("student"),
    name: trimmedName,
    classId: selectedClassId,
  };
  state.students.push(student);
  saveState();
  renderAll();
  els.studentSelect.value = student.id;
  els.studentName.value = "";
  showToast(`已新增 ${trimmedName}`);
}

function saveEntry() {
  if (!selectedClassId) {
    showToast("請先新增班級");
    return;
  }

  if (!studentsInSelectedClass().length) {
    showToast("請先新增學生");
    return;
  }

  const studentId = els.studentSelect.value;
  const reason = els.reasonInput.value.trim();
  state.entries.push({
    id: createId("entry"),
    studentId,
    classId: selectedClassId,
    mode: selectedMode,
    points: selectedPoints,
    reason,
    createdAt: new Date().toISOString(),
  });

  saveState();
  renderAll();
  els.reasonInput.value = "";
  showToast("已登錄點數");
}

function undoLastEntry() {
  if (!state.entries.length) {
    showToast("沒有可復原的紀錄");
    return;
  }

  state.entries.pop();
  saveState();
  renderAll();
  showToast("已復原上一筆");
}

function clearAllData() {
  if (!confirm("確定要清除全部學生與紀錄？")) return;
  state.classes = [];
  state.students = [];
  state.entries = [];
  selectedClassId = "";
  state.selectedClassId = "";
  saveState();
  renderAll();
  showToast("資料已清除");
}

function exportCsv() {
  const rows = [["時間", "班級", "學生", "類型", "點數", "原因"]];
  state.entries.forEach((entry) => {
    rows.push([
      formatTime(entry.createdAt),
      classNameById(entry.classId),
      studentNameById(entry.studentId),
      entry.mode === "reward" ? "獎勵" : "懲罰",
      entry.points,
      entry.reason || "",
    ]);
  });

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `學生獎懲點數-${localDateKey()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("已匯出 CSV");
}

els.classForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addClass(els.className.value);
});

els.classSelect.addEventListener("change", () => {
  selectedClassId = els.classSelect.value;
  state.selectedClassId = selectedClassId;
  saveState();
  renderAll();
});

els.studentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addStudent(els.studentName.value);
});

els.rewardMode.addEventListener("click", () => setMode("reward"));
els.penaltyMode.addEventListener("click", () => setMode("penalty"));
els.minusPoint.addEventListener("click", () => setPoints(selectedPoints - 1));
els.plusPoint.addEventListener("click", () => setPoints(selectedPoints + 1));
els.saveEntry.addEventListener("click", saveEntry);
els.undoBtn.addEventListener("click", undoLastEntry);
els.clearAllBtn.addEventListener("click", clearAllData);
els.exportBtn.addEventListener("click", exportCsv);

setMode("reward");
setPoints(1);
renderAll();
