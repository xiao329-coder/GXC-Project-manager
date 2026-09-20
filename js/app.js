// ===== Event Bus =====
const EventBus = {
  listeners: {},
  on(event, cb) {
    (this.listeners[event] = this.listeners[event] || []).push(cb);
  },
  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => cb(data));
  }
};

// ===== State =====
let currentPage = 'dashboard';
let editingTaskId = null;
let selectedReportProject = '';

// ===== Utils =====
function isOverdue(task) {
  if (task.status === 'done' || !task.dueDate) return false;
  return new Date(task.dueDate) < new Date(new Date().toDateString());
}

function priorityLabel(p) {
  return { high: '高', medium: '中', low: '低' }[p] || '中';
}

function priorityColor(p) {
  return { high: '#fa5252', medium: '#fab005', low: '#40c057' }[p] || '#fab005';
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// ===== Navigation =====
function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  renderPage();
}

function renderPage() {
  const main = document.getElementById('main-content');
  switch (currentPage) {
    case 'dashboard':
      main.innerHTML = renderDashboard();
      break;
    case 'board':
      main.innerHTML = renderBoard();
      attachBoardEvents();
      break;
    case 'report':
      main.innerHTML = renderReport();
      break;
  }
}

// ===== Dashboard =====
function renderDashboard() {
  const tasks = Storage.getTasks();
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'done').length;
  const inProgress = tasks.filter(t => t.status === 'in-progress').length;
  const todo = tasks.filter(t => t.status === 'todo').length;
  const overdue = tasks.filter(t => isOverdue(t)).length;
  const completionRate = total > 0 ? Math.round(done / total * 100) : 0;

  const projects = {};
  tasks.forEach(t => {
    const p = t.projectName || '未分类';
    if (!projects[p]) projects[p] = { total: 0, done: 0, inProgress: 0 };
    projects[p].total++;
    if (t.status === 'done') projects[p].done++;
    if (t.status === 'in-progress') projects[p].inProgress++;
  });

  let html = '<div class="page-header"><h2>📊 仪表盘</h2></div>';

  html += '<div class="stat-cards">';
  html += statCard('📋', total, '总任务');
  html += statCard('✅', done, '已完成', 'var(--success)');
  html += statCard('🔄', inProgress, '进行中', 'var(--primary)');
  html += statCard('⏳', todo, '待办', 'var(--warning)');
  html += '</div>';

  html += '<div class="dashboard-row">';
  html += '<div class="card">';
  html += '<h3>整体完成率</h3>';
  html += '<div class="big-progress">';
  html += '<div class="big-progress-text">' + completionRate + '%</div>';
  html += '<div class="progress-bar large"><div class="progress-fill" style="width:' + completionRate + '%"></div></div>';
  html += '</div></div>';
  if (overdue > 0) {
    html += '<div class="card alert-card"><h3>⚠️ 逾期提醒</h3>';
    html += '<div class="alert-text">' + overdue + ' 个任务已逾期，请及时处理</div></div>';
  } else {
    html += '<div class="card"><h3>📋 状态</h3><div class="empty-text">暂无逾期任务</div></div>';
  }
  html += '</div>';

  html += '<div class="card"><h3>项目进度</h3><div class="project-list">';
  if (Object.keys(projects).length === 0) {
    html += '<div class="empty-text">暂无项目</div>';
  } else {
    for (const [name, data] of Object.entries(projects)) {
      const rate = Math.round(data.done / data.total * 100);
      html += '<div class="project-item">';
      html += '<div class="project-info"><span class="project-name">' + name + '</span>';
      html += '<span class="project-stats">' + data.done + '/' + data.total + ' (' + rate + '%)</span></div>';
      html += '<div class="progress-bar"><div class="progress-fill" style="width:' + rate + '%"></div></div>';
      html += '</div>';
    }
  }
  html += '</div></div>';

  html += '<div class="card"><h3>最近任务</h3><div class="recent-tasks">';
  if (tasks.length === 0) {
    html += '<div class="empty-text">暂无任务</div>';
  } else {
    tasks.slice(-6).reverse().forEach(t => {
      html += '<div class="recent-task-item" onclick="navigateTo(\'board\');setTimeout(function(){openTaskModal(\'' + t.id + '\')},100)">';
      html += '<span class="task-status-dot status-' + t.status + '"></span>';
      html += '<span class="recent-task-title">' + escapeHtml(t.title) + '</span>';
      html += '<span class="recent-task-project">' + (t.projectName || '未分类') + '</span>';
      html += '</div>';
    });
  }
  html += '</div></div>';

  return html;
}

function statCard(icon, value, label, color) {
  return '<div class="stat-card"><div class="stat-icon"' +
    (color ? ' style="color:' + color + '"' : '') + '>' + icon + '</div>' +
    '<div class="stat-info"><div class="stat-value">' + value + '</div>' +
    '<div class="stat-label">' + label + '</div></div></div>';
}

// ===== Task Board =====
function renderBoard() {
  const tasks = Storage.getTasks();
  const columns = [
    { status: 'todo', title: '待办', color: '#fab005', icon: '⏳' },
    { status: 'in-progress', title: '进行中', color: '#5c7cfa', icon: '🔄' },
    { status: 'done', title: '已完成', color: '#40c057', icon: '✅' }
  ];

  let html = '<div class="page-header"><h2>✅ 任务看板</h2>';
  html += '<button class="btn btn-primary" onclick="openTaskModal()">+ 新建任务</button></div>';

  if (tasks.length === 0) {
    html += '<div class="empty-state"><div class="empty-icon">📝</div>';
    html += '<p>还没有任务，点击上方按钮创建第一个任务</p></div>';
    return html;
  }

  html += '<div class="board-columns">';
  for (const col of columns) {
    const colTasks = tasks.filter(t => t.status === col.status);
    html += '<div class="board-column">';
    html += '<div class="column-header">';
    html += '<span class="column-dot" style="background:' + col.color + '"></span>';
    html += '<span>' + col.icon + ' ' + col.title + '</span>';
    html += '<span class="column-count">' + colTasks.length + '</span>';
    html += '</div>';
    html += '<div class="column-body" data-status="' + col.status + '">';
    colTasks.forEach(t => { html += renderTaskCard(t); });
    html += '</div></div>';
  }
  html += '</div>';
  return html;
}

function renderTaskCard(task) {
  const overdue = isOverdue(task);
  const pColor = priorityColor(task.priority);
  let html = '<div class="task-card" draggable="true" data-id="' + task.id + '" onclick="openTaskModal(\'' + task.id + '\')">';
  html += '<div class="task-card-top">';
  html += '<span class="task-priority-tag" style="background:' + pColor + '20;color:' + pColor + ';border-color:' + pColor + '40">' + priorityLabel(task.priority) + '优先级</span>';
  if (task.projectName) {
    html += '<span class="task-project-tag">' + escapeHtml(task.projectName) + '</span>';
  }
  html += '</div>';
  html += '<div class="task-card-title">' + escapeHtml(task.title) + '</div>';
  if (task.description) {
    html += '<div class="task-card-desc">' + escapeHtml(task.description) + '</div>';
  }
  html += '<div class="task-card-progress">';
  html += '<div class="progress-bar"><div class="progress-fill" style="width:' + (task.progress || 0) + '%"></div></div>';
  html += '<span class="progress-text-small">' + (task.progress || 0) + '%</span>';
  html += '</div>';
  html += '<div class="task-card-bottom">';
  if (task.assignee) html += '<span>👤 ' + escapeHtml(task.assignee) + '</span>';
  if (task.dueDate) {
    html += '<span class="' + (overdue ? 'text-danger' : '') + '">📅 ' + task.dueDate + (overdue ? ' ⚠️' : '') + '</span>';
  }
  html += '</div></div>';
  return html;
}

function attachBoardEvents() {
  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', card.dataset.id);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
  });

  document.querySelectorAll('.column-body').forEach(zone => {
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', () => {
      zone.classList.remove('drag-over');
    });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const taskId = e.dataTransfer.getData('text/plain');
      const newStatus = zone.dataset.status;
      moveTask(taskId, newStatus);
    });
  });
}

function moveTask(taskId, newStatus) {
  const tasks = Storage.getTasks();
  const task = tasks.find(t => t.id === taskId);
  if (task && task.status !== newStatus) {
    task.status = newStatus;
    if (newStatus === 'done') task.progress = 100;
    else if (newStatus === 'todo') task.progress = 0;
    Storage.saveTasks(tasks);
    EventBus.emit('tasksChanged');
  }
}

// ===== Task Modal =====
function openTaskModal(taskId) {
  editingTaskId = taskId || null;
  const title = document.getElementById('modalTitle');
  const deleteBtn = document.getElementById('deleteTaskBtn');

  const projects = Storage.getProjects();
  document.getElementById('projectList').innerHTML =
    projects.map(p => '<option value="' + escapeHtml(p) + '">').join('');

  if (taskId) {
    const task = Storage.getTasks().find(t => t.id === taskId);
    if (!task) return;
    title.textContent = '编辑任务';
    deleteBtn.style.display = 'inline-flex';
    document.getElementById('taskTitle').value = task.title || '';
    document.getElementById('taskProject').value = task.projectName || '';
    document.getElementById('taskAssignee').value = task.assignee || '';
    document.getElementById('taskStatus').value = task.status;
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskDueDate').value = task.dueDate || '';
    document.getElementById('taskProgress').value = task.progress || 0;
    document.getElementById('progressValue').textContent = task.progress || 0;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskNotes').value = task.notes || '';
  } else {
    title.textContent = '新建任务';
    deleteBtn.style.display = 'none';
    document.getElementById('taskForm').reset();
    document.getElementById('taskStatus').value = 'todo';
    document.getElementById('taskPriority').value = 'medium';
    document.getElementById('taskProgress').value = 0;
    document.getElementById('progressValue').textContent = '0';
  }

  document.getElementById('taskModal').classList.remove('hidden');
}

function closeTaskModal() {
  document.getElementById('taskModal').classList.add('hidden');
  editingTaskId = null;
}

function saveTaskFromModal() {
  const title = document.getElementById('taskTitle').value.trim();
  if (!title) { alert('请输入任务标题'); return; }

  const tasks = Storage.getTasks();
  const taskData = {
    title: title,
    projectName: document.getElementById('taskProject').value.trim(),
    assignee: document.getElementById('taskAssignee').value.trim(),
    status: document.getElementById('taskStatus').value,
    priority: document.getElementById('taskPriority').value,
    dueDate: document.getElementById('taskDueDate').value,
    progress: parseInt(document.getElementById('taskProgress').value, 10),
    description: document.getElementById('taskDescription').value.trim(),
    notes: document.getElementById('taskNotes').value.trim()
  };

  if (editingTaskId) {
    const task = tasks.find(t => t.id === editingTaskId);
    if (task) Object.assign(task, taskData);
  } else {
    taskData.id = Storage.generateId();
    taskData.createdDate = todayStr();
    tasks.push(taskData);
  }

  Storage.saveTasks(tasks);
  closeTaskModal();
  EventBus.emit('tasksChanged');
}

function deleteTaskFromModal() {
  if (!editingTaskId) return;
  if (!confirm('确定删除这个任务吗？')) return;
  const tasks = Storage.getTasks().filter(t => t.id !== editingTaskId);
  Storage.saveTasks(tasks);
  closeTaskModal();
  EventBus.emit('tasksChanged');
}

// ===== Meeting Report =====
function renderReport() {
  const tasks = Storage.getTasks();
  const projects = Storage.getProjects();

  let html = '<div class="page-header"><h2>🎤 组会汇报</h2>';
  html += '<div class="report-controls">';

  if (projects.length === 0) {
    html += '</div></div>';
    html += '<div class="empty-state"><div class="empty-icon">📋</div>';
    html += '<p>暂无任务数据，请先在任务看板中添加任务</p></div>';
    return html;
  }

  if (!selectedReportProject || projects.indexOf(selectedReportProject) === -1) {
    selectedReportProject = projects[0];
  }

  html += '<select onchange="selectReportProject(this.value)">';
  projects.forEach(p => {
    html += '<option value="' + escapeHtml(p) + '"' + (p === selectedReportProject ? ' selected' : '') + '>' + escapeHtml(p) + '</option>';
  });
  html += '</select>';
  html += '<button class="btn" onclick="window.print()">🖨️ 打印/导出PDF</button>';
  html += '</div></div>';

  const projectTasks = tasks.filter(t => (t.projectName || '未分类') === selectedReportProject);
  const done = projectTasks.filter(t => t.status === 'done');
  const inProgress = projectTasks.filter(t => t.status === 'in-progress');
  const todo = projectTasks.filter(t => t.status === 'todo');
  const overdue = projectTasks.filter(t => isOverdue(t));
  const total = projectTasks.length;
  const rate = total > 0 ? Math.round(done.length / total * 100) : 0;
  const avgProgress = total > 0 ? Math.round(projectTasks.reduce((s, t) => s + (t.progress || 0), 0) / total) : 0;

  html += '<div class="report">';
  html += '<div class="report-header">';
  html += '<h1>' + escapeHtml(selectedReportProject) + '</h1>';
  html += '<div class="report-date">汇报日期：' + todayStr() + '</div>';
  html += '</div>';

  html += '<div class="report-section"><h2>一、项目概况</h2>';
  html += '<div class="report-overview">';
  html += overviewItem('总任务数', total);
  html += overviewItem('已完成', done.length, 'text-success');
  html += overviewItem('进行中', inProgress.length, 'text-primary');
  html += overviewItem('待办', todo.length, 'text-warning');
  html += overviewItem('完成率', rate + '%');
  html += overviewItem('平均进度', avgProgress + '%');
  html += '</div>';
  html += '<div class="progress-bar large"><div class="progress-fill" style="width:' + rate + '%"></div></div>';
  html += '</div>';

  if (done.length > 0) {
    html += '<div class="report-section"><h2>二、已完成成果</h2><div class="report-task-list">';
    done.forEach(t => {
      html += reportTaskItem('✅', t, false);
    });
    html += '</div></div>';
  }

  if (inProgress.length > 0) {
    html += '<div class="report-section"><h2>三、当前进展</h2><div class="report-task-list">';
    inProgress.forEach(t => {
      html += reportTaskItem('🔄', t, true);
    });
    html += '</div></div>';
  }

  if (todo.length > 0) {
    html += '<div class="report-section"><h2>四、下一步计划</h2><div class="report-task-list">';
    todo.forEach(t => {
      html += reportTaskItem('⏳', t, false);
    });
    html += '</div></div>';
  }

  if (overdue.length > 0) {
    html += '<div class="report-section"><h2 class="text-danger">⚠️ 风险提醒</h2><div class="report-task-list">';
    overdue.forEach(t => {
      html += '<div class="report-task-item"><span class="report-task-icon">⚠️</span>';
      html += '<div class="report-task-content">';
      html += '<div class="report-task-title">' + escapeHtml(t.title) + '</div>';
      html += '<div class="report-task-meta text-danger">📅 截止日期: ' + t.dueDate + ' (已逾期)</div>';
      html += '</div></div>';
    });
    html += '</div></div>';
  }

  html += '</div>';
  return html;
}

function overviewItem(label, value, colorClass) {
  return '<div class="overview-item"><span class="overview-label">' + label +
    '</span><span class="overview-value ' + (colorClass || '') + '">' + value + '</span></div>';
}

function reportTaskItem(icon, task, showProgress) {
  let html = '<div class="report-task-item"><span class="report-task-icon">' + icon + '</span>';
  html += '<div class="report-task-content">';
  html += '<div class="report-task-title">' + escapeHtml(task.title) + '</div>';
  if (task.description) {
    html += '<div class="report-task-desc">' + escapeHtml(task.description) + '</div>';
  }
  if (task.notes) {
    html += '<div class="report-task-notes">⚠️ ' + escapeHtml(task.notes) + '</div>';
  }
  html += '<div class="report-task-meta">';
  let metaParts = [];
  if (task.assignee) metaParts.push('👤 ' + task.assignee);
  if (task.dueDate) metaParts.push('📅 ' + task.dueDate);
  if (showProgress) metaParts.push('进度: ' + (task.progress || 0) + '%');
  html += metaParts.join(' | ');
  html += '</div>';
  if (showProgress) {
    html += '<div class="progress-bar" style="margin-top:4px"><div class="progress-fill" style="width:' + (task.progress || 0) + '%"></div></div>';
  }
  html += '</div></div>';
  return html;
}

function selectReportProject(project) {
  selectedReportProject = project;
  renderPage();
}

// ===== Theme =====
function applyTheme() {
  const theme = Storage.getTheme();
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('themeIcon');
  const text = document.getElementById('themeText');
  if (theme === 'dark') {
    icon.textContent = '☀️';
    text.textContent = '浅色模式';
  } else {
    icon.textContent = '🌙';
    text.textContent = '深色模式';
  }
}

function toggleTheme() {
  const current = Storage.getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  Storage.setTheme(next);
  applyTheme();
}

// ===== Import/Export =====
function handleExport() {
  const data = Storage.exportData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'project-data-' + todayStr() + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function handleImport(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      Storage.importData(e.target.result);
      EventBus.emit('tasksChanged');
      alert('数据导入成功！');
    } catch (err) {
      alert('导入失败：' + err.message);
    }
  };
  reader.readAsText(file);
}

// ===== HTML Escape =====
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ===== Event Bus: data change triggers re-render =====
EventBus.on('tasksChanged', function() {
  renderPage();
});

// ===== Init =====
function init() {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', function(e) {
      e.preventDefault();
      navigateTo(el.dataset.page);
    });
  });

  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  applyTheme();

  document.getElementById('modalClose').addEventListener('click', closeTaskModal);
  document.getElementById('cancelBtn').addEventListener('click', closeTaskModal);
  document.getElementById('saveTaskBtn').addEventListener('click', saveTaskFromModal);
  document.getElementById('deleteTaskBtn').addEventListener('click', deleteTaskFromModal);
  document.getElementById('taskModal').addEventListener('click', function(e) {
    if (e.target.id === 'taskModal') closeTaskModal();
  });
  document.getElementById('taskProgress').addEventListener('input', function(e) {
    document.getElementById('progressValue').textContent = e.target.value;
  });
  document.getElementById('taskStatus').addEventListener('change', function(e) {
    var progress = document.getElementById('taskProgress');
    var progressValue = document.getElementById('progressValue');
    if (e.target.value === 'done') {
      progress.value = 100;
      progressValue.textContent = '100';
    } else if (e.target.value === 'todo') {
      progress.value = 0;
      progressValue.textContent = '0';
    }
  });

  document.getElementById('exportBtn').addEventListener('click', handleExport);
  document.getElementById('importBtn').addEventListener('click', function() {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', function(e) {
    if (e.target.files[0]) handleImport(e.target.files[0]);
    e.target.value = '';
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeTaskModal();
  });

  renderPage();
}

document.addEventListener('DOMContentLoaded', init);
