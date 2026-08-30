/**
 * 项目管理 - 主应用逻辑
 */

(function () {
  'use strict';

  // ===== 全局状态 =====
  let currentPage = 'dashboard';
  let currentTaskProjectId = null;
  let currentReportProjectId = null;
  let confirmCallback = null;
  let draggedTaskId = null;

  // ===== 工具函数 =====

  function $(selector, context = document) {
    return context.querySelector(selector);
  }

  function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  }

  function showToast(message, type = 'info', duration = 2500) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    setTimeout(() => {
      toast.className = 'toast';
    }, duration);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function formatRelativeTime(isoString) {
    const now = new Date();
    const date = new Date(isoString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return formatDate(isoString);
  }

  function isOverdue(dueDate) {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ===== 模态框 =====

  function openModal(id) {
    const modal = $('#' + id);
    if (modal) modal.classList.add('open');
  }

  function closeModal(id) {
    const modal = $('#' + id);
    if (modal) modal.classList.remove('open');
  }

  function showConfirm(message, callback) {
    $('#confirm-message').textContent = message;
    confirmCallback = callback;
    openModal('modal-confirm');
  }

  // ===== 导航 =====

  function switchPage(pageName) {
    currentPage = pageName;

    // 更新导航状态
    $$('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === pageName);
    });

    // 更新页面显示
    $$('.page').forEach(page => {
      page.classList.remove('active');
    });
    const targetPage = $('#page-' + pageName);
    if (targetPage) targetPage.classList.add('active');

    // 页面切换时刷新对应内容
    if (pageName === 'dashboard') renderDashboard();
    if (pageName === 'projects') renderProjects();
    if (pageName === 'tasks') renderTasks();
    if (pageName === 'report') renderReport();
  }

  // ===== 仪表盘 =====

  function renderDashboard() {
    renderStats();
    renderProjectProgress();
    renderRecentActivity();
  }

  function renderStats() {
    const stats = Store.getStats();
    const grid = $('#stats-grid');
    grid.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">📁</div>
        <div class="stat-value">${stats.totalProjects}</div>
        <div class="stat-label">项目总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🚀</div>
        <div class="stat-value">${stats.activeProjects}</div>
        <div class="stat-label">进行中项目</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-value">${stats.completedTasks}/${stats.totalTasks}</div>
        <div class="stat-label">任务完成</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-value">${stats.completionRate}%</div>
        <div class="stat-label">整体完成率</div>
      </div>
    `;
  }

  function renderProjectProgress() {
    const projects = Store.getProjects();
    const container = $('#project-progress-list');

    if (projects.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">暂无项目</div></div>';
      return;
    }

    container.innerHTML = projects.slice(0, 6).map(p => {
      const progress = Store.getProjectProgress(p.id);
      const statusText = { 'planning': '计划中', 'active': '进行中', 'paused': '暂停', 'completed': '已完成' };
      return `
        <div class="progress-item">
          <div class="progress-header">
            <span class="progress-name">${escapeHtml(p.name)}</span>
            <span class="progress-percent">${progress}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderRecentActivity() {
    const activities = Store.getRecentActivities(8);
    const container = $('#recent-activity');

    if (activities.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">暂无动态</div></div>';
      return;
    }

    container.innerHTML = activities.map(a => `
      <div class="activity-item">
        <div class="activity-dot"></div>
        <div class="activity-content">
          <div class="activity-text">${escapeHtml(a.text)}</div>
          <div class="activity-time">${formatRelativeTime(a.timestamp)}</div>
        </div>
      </div>
    `).join('');
  }

  // ===== 项目管理 =====

  function renderProjects() {
    const projects = Store.getProjects();
    const grid = $('#project-grid');

    if (projects.length === 0) {
      grid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><div class="empty-state-icon">📭</div><div class="empty-state-text">还没有项目，点击右上角「新建项目」开始吧</div></div>';
      return;
    }

    const statusText = { 'planning': '计划中', 'active': '进行中', 'paused': '暂停', 'completed': '已完成' };

    grid.innerHTML = projects.map(p => {
      const progress = Store.getProjectProgress(p.id);
      const taskCount = Store.getTasks(p.id).length;
      return `
        <div class="project-card" data-id="${p.id}">
          <div class="project-card-header">
            <div class="project-card-title">${escapeHtml(p.name)}</div>
            <div class="dropdown">
              <button class="project-card-menu" data-action="menu" data-id="${p.id}">⋯</button>
              <div class="dropdown-menu" data-menu="${p.id}">
                <button class="dropdown-item" data-action="edit-project" data-id="${p.id}">编辑</button>
                <button class="dropdown-item danger" data-action="delete-project" data-id="${p.id}">删除</button>
              </div>
            </div>
          </div>
          <div class="project-card-desc">${escapeHtml(p.description || '暂无描述')}</div>
          <div class="project-card-progress">
            <div class="progress-header">
              <span class="progress-name" style="font-size: 12px; color: var(--text-secondary);">进度</span>
              <span class="progress-percent">${progress}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
          </div>
          <div class="project-card-meta">
            <span class="status-badge status-${p.status}">${statusText[p.status] || p.status}</span>
            <span>${taskCount} 个任务</span>
          </div>
        </div>
      `;
    }).join('');

    // 绑定项目卡片点击事件
    $$('.project-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) return;
        const id = card.dataset.id;
        currentTaskProjectId = id;
        switchPage('tasks');
      });
    });
  }

  function openProjectModal(project = null) {
    const form = $('#form-project');
    form.reset();

    if (project) {
      $('#project-modal-title').textContent = '编辑项目';
      $('#project-id').value = project.id;
      $('#project-name').value = project.name;
      $('#project-desc').value = project.description || '';
      $('#project-start').value = project.startDate || '';
      $('#project-end').value = project.endDate || '';
      $('#project-status').value = project.status;
      $('#project-members').value = (project.members || []).join(', ');
    } else {
      $('#project-modal-title').textContent = '新建项目';
      $('#project-id').value = '';
    }

    openModal('modal-project');
    setTimeout(() => $('#project-name').focus(), 100);
  }

  function saveProject() {
    const id = $('#project-id').value;
    const name = $('#project-name').value.trim();
    if (!name) {
      showToast('请输入项目名称', 'error');
      return;
    }

    const projectData = {
      name,
      description: $('#project-desc').value.trim(),
      startDate: $('#project-start').value,
      endDate: $('#project-end').value,
      status: $('#project-status').value,
      members: $('#project-members').value.split(',').map(s => s.trim()).filter(s => s)
    };

    if (id) {
      Store.updateProject(id, projectData);
      showToast('项目已更新', 'success');
    } else {
      Store.addProject(projectData);
      showToast('项目已创建', 'success');
    }

    closeModal('modal-project');
    renderProjects();
  }

  function deleteProject(id) {
    const project = Store.getProject(id);
    if (!project) return;
    showConfirm(`确定要删除项目「${project.name}」吗？相关任务也会被删除。`, () => {
      Store.deleteProject(id);
      showToast('项目已删除', 'success');
      renderProjects();
    });
  }

  // ===== 任务看板 =====

  function renderTaskProjectSelect() {
    const projects = Store.getProjects();
    const select = $('#task-project-select');
    const taskProjectSelect = $('#task-project');

    const options = projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    select.innerHTML = options;
    taskProjectSelect.innerHTML = options;

    if (projects.length > 0 && !currentTaskProjectId) {
      currentTaskProjectId = projects[0].id;
    }
    if (currentTaskProjectId) {
      select.value = currentTaskProjectId;
    }
  }

  function renderTasks() {
    renderTaskProjectSelect();

    if (!currentTaskProjectId) {
      ['todo', 'in-progress', 'done'].forEach(status => {
        $('#list-' + status).innerHTML = '';
        $('#count-' + status).textContent = '0';
      });
      return;
    }

    const tasks = Store.getTasks(currentTaskProjectId);

    ['todo', 'in-progress', 'done'].forEach(status => {
      const list = $('#list-' + status);
      const count = $('#count-' + status);
      const statusTasks = tasks.filter(t => t.status === status);
      count.textContent = statusTasks.length;

      if (statusTasks.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color: var(--text-tertiary); font-size: 12px;">暂无任务</div>';
        return;
      }

      list.innerHTML = statusTasks.map(t => {
        const priorityText = { 'high': '高', 'medium': '中', 'low': '低' };
        const overdue = isOverdue(t.dueDate) && t.status !== 'done';
        return `
          <div class="task-card" draggable="true" data-id="${t.id}">
            <div class="task-title">${escapeHtml(t.title)}</div>
            <div class="task-desc">${escapeHtml(t.description || '')}</div>
            <div class="task-footer">
              <span class="priority-badge priority-${t.priority}">${priorityText[t.priority]}</span>
              <span class="task-due ${overdue ? 'overdue' : ''}">${t.dueDate ? formatDate(t.dueDate) : ''}</span>
            </div>
          </div>
        `;
      }).join('');
    });

    bindTaskDragEvents();
    bindTaskClickEvents();
  }

  function bindTaskDragEvents() {
    $$('.task-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        draggedTaskId = card.dataset.id;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        draggedTaskId = null;
      });
    });

    $$('.kanban-column').forEach(col => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      col.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!draggedTaskId) return;
        const status = col.dataset.status;
        Store.updateTask(draggedTaskId, { status });
        renderTasks();
        showToast('状态已更新', 'success');
      });
    });
  }

  function bindTaskClickEvents() {
    $$('.task-card').forEach(card => {
      card.addEventListener('dblclick', () => {
        const id = card.dataset.id;
        const task = Store.getTask(id);
        if (task) openTaskModal(task);
      });
    });
  }

  function openTaskModal(task = null) {
    const form = $('#form-task');
    form.reset();

    // 确保项目下拉框有数据
    renderTaskProjectSelect();

    if (task) {
      $('#task-modal-title').textContent = '编辑任务';
      $('#task-id').value = task.id;
      $('#task-title').value = task.title;
      $('#task-desc').value = task.description || '';
      $('#task-project').value = task.projectId;
      $('#task-status').value = task.status;
      $('#task-priority').value = task.priority;
      $('#task-due').value = task.dueDate || '';
      $('#task-assignee').value = task.assignee || '';
    } else {
      $('#task-modal-title').textContent = '新建任务';
      $('#task-id').value = '';
      if (currentTaskProjectId) {
        $('#task-project').value = currentTaskProjectId;
      }
    }

    openModal('modal-task');
    setTimeout(() => $('#task-title').focus(), 100);
  }

  function saveTask() {
    const id = $('#task-id').value;
    const title = $('#task-title').value.trim();
    if (!title) {
      showToast('请输入任务标题', 'error');
      return;
    }

    const taskData = {
      title,
      description: $('#task-desc').value.trim(),
      projectId: $('#task-project').value,
      status: $('#task-status').value,
      priority: $('#task-priority').value,
      dueDate: $('#task-due').value,
      assignee: $('#task-assignee').value.trim()
    };

    if (!taskData.projectId) {
      showToast('请选择所属项目', 'error');
      return;
    }

    if (id) {
      Store.updateTask(id, taskData);
      showToast('任务已更新', 'success');
    } else {
      Store.addTask(taskData);
      showToast('任务已创建', 'success');
    }

    currentTaskProjectId = taskData.projectId;
    closeModal('modal-task');
    renderTasks();
  }

  // ===== 组会汇报 =====

  function renderReportProjectSelect() {
    const projects = Store.getProjects();
    const select = $('#report-project-select');
    const options = projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    select.innerHTML = options;

    if (projects.length > 0 && !currentReportProjectId) {
      currentReportProjectId = projects[0].id;
    }
    if (currentReportProjectId) {
      select.value = currentReportProjectId;
    }
  }

  function renderReport() {
    renderReportProjectSelect();
    const container = $('#report-container');

    if (!currentReportProjectId) {
      container.innerHTML = `
        <div class="report-empty">
          <div class="report-empty-icon">📝</div>
          <div>暂无项目，无法生成汇报</div>
        </div>
      `;
      return;
    }

    const project = Store.getProject(currentReportProjectId);
    const tasks = Store.getTasks(currentReportProjectId);
    const progress = Store.getProjectProgress(currentReportProjectId);

    const todoTasks = tasks.filter(t => t.status === 'todo');
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
    const doneTasks = tasks.filter(t => t.status === 'done');

    container.innerHTML = `
      <div class="report-header">
        <h2>${escapeHtml(project.name)}</h2>
        <div class="report-meta">
          组会汇报 · ${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div class="report-summary-grid">
        <div class="report-summary-item">
          <div class="number">${progress}%</div>
          <div class="label">项目进度</div>
        </div>
        <div class="report-summary-item">
          <div class="number">${doneTasks.length}/${tasks.length}</div>
          <div class="label">任务完成</div>
        </div>
        <div class="report-summary-item">
          <div class="number">${inProgressTasks.length}</div>
          <div class="label">进行中</div>
        </div>
      </div>

      <div class="report-section">
        <h3>项目概况</h3>
        <p>${escapeHtml(project.description || '暂无描述')}</p>
        <p style="margin-top: 8px;">
          <strong>项目周期：</strong>${formatDate(project.startDate)} ~ ${formatDate(project.endDate)}<br>
          <strong>项目状态：</strong>${{ 'planning': '计划中', 'active': '进行中', 'paused': '暂停', 'completed': '已完成' }[project.status]}<br>
          ${project.members && project.members.length > 0 ? `<strong>成员：</strong>${project.members.join('、')}` : ''}
        </p>
      </div>

      <div class="report-section">
        <h3>本周完成</h3>
        ${doneTasks.length > 0 ? `
          <ul class="report-task-list">
            ${doneTasks.map(t => `
              <li>
                <span class="task-name">✅ ${escapeHtml(t.title)}</span>
                <span class="task-status-text">${t.assignee ? escapeHtml(t.assignee) : ''}</span>
              </li>
            `).join('')}
          </ul>
        ` : '<p>暂无已完成任务。</p>'}
      </div>

      <div class="report-section">
        <h3>正在进行</h3>
        ${inProgressTasks.length > 0 ? `
          <ul class="report-task-list">
            ${inProgressTasks.map(t => `
              <li>
                <span class="task-name">🚀 ${escapeHtml(t.title)}</span>
                <span class="task-status-text">${t.assignee ? escapeHtml(t.assignee) : ''}</span>
              </li>
            `).join('')}
          </ul>
        ` : '<p>暂无进行中的任务。</p>'}
      </div>

      <div class="report-section">
        <h3>待办计划</h3>
        ${todoTasks.length > 0 ? `
          <ul class="report-task-list">
            ${todoTasks.map(t => `
              <li>
                <span class="task-name">📋 ${escapeHtml(t.title)}</span>
                <span class="task-status-text">${t.dueDate ? formatDate(t.dueDate) : ''}</span>
              </li>
            `).join('')}
          </ul>
        ` : '<p>暂无待办任务。</p>'}
      </div>

      <div class="report-section">
        <h3>问题与风险</h3>
        <p style="color: var(--text-secondary); font-style: italic;">（请在汇报时补充说明当前遇到的问题和风险）</p>
      </div>

      <div class="report-section">
        <h3>下周计划</h3>
        <p style="color: var(--text-secondary); font-style: italic;">（请在汇报时补充下周的工作计划）</p>
      </div>
    `;
  }

  // ===== 导入导出 =====

  function handleExport() {
    Store.exportData();
    showToast('数据已导出', 'success');
  }

  function handleImport(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = Store.importData(e.target.result);
      if (result.success) {
        showToast('数据导入成功', 'success');
        switchPage(currentPage); // 刷新当前页
      } else {
        showToast(result.message || '导入失败', 'error');
      }
    };
    reader.onerror = () => {
      showToast('文件读取失败', 'error');
    };
    reader.readAsText(file);
  }

  // ===== 主题切换 =====

  function initTheme() {
    const theme = Store.getTheme();
    Store.setTheme(theme);
    updateThemeButton(theme);
  }

  function toggleTheme() {
    const current = Store.getTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    Store.setTheme(next);
    updateThemeButton(next);
  }

  function updateThemeButton(theme) {
    $('#theme-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
    $('#theme-text').textContent = theme === 'dark' ? '浅色模式' : '深色模式';
  }

  // ===== 事件绑定 =====

  function bindEvents() {
    // 导航
    $$('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        switchPage(item.dataset.page);
      });
    });

    // 关闭模态框
    $$('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        closeModal(btn.dataset.close);
      });
    });

    // 点击遮罩关闭模态框
    $$('.modal-mask').forEach(mask => {
      mask.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) modal.classList.remove('open');
      });
    });

    // 项目管理
    $('#btn-add-project').addEventListener('click', () => openProjectModal());
    $('#btn-save-project').addEventListener('click', saveProject);

    // 项目表单回车提交
    $('#form-project').addEventListener('submit', (e) => {
      e.preventDefault();
      saveProject();
    });

    // 任务看板
    $('#btn-add-task').addEventListener('click', () => {
      const projects = Store.getProjects();
      if (projects.length === 0) {
        showToast('请先创建项目', 'error');
        return;
      }
      openTaskModal();
    });
    $('#btn-save-task').addEventListener('click', saveTask);

    $('#task-project-select').addEventListener('change', (e) => {
      currentTaskProjectId = e.target.value;
      renderTasks();
    });

    // 任务表单回车提交
    $('#form-task').addEventListener('submit', (e) => {
      e.preventDefault();
      saveTask();
    });

    // 汇报
    $('#report-project-select').addEventListener('change', (e) => {
      currentReportProjectId = e.target.value;
      renderReport();
    });

    $('#btn-print-report').addEventListener('click', () => {
      window.print();
    });

    // 导入导出
    $('#btn-export').addEventListener('click', handleExport);
    $('#btn-import').addEventListener('click', () => $('#file-import').click());
    $('#file-import').addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleImport(e.target.files[0]);
        e.target.value = '';
      }
    });

    // 主题切换
    $('#btn-theme').addEventListener('click', toggleTheme);

    // 确认对话框
    $('#btn-confirm-ok').addEventListener('click', () => {
      closeModal('modal-confirm');
      if (confirmCallback) {
        confirmCallback();
        confirmCallback = null;
      }
    });

    // 项目卡片下拉菜单
    document.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        const action = actionBtn.dataset.action;
        const id = actionBtn.dataset.id;

        if (action === 'menu') {
          e.stopPropagation();
          const menu = document.querySelector(`[data-menu="${id}"]`);
          // 先关闭其他菜单
          $$('.dropdown-menu.show').forEach(m => {
            if (m !== menu) m.classList.remove('show');
          });
          menu.classList.toggle('show');
          return;
        }

        if (action === 'edit-project') {
          const project = Store.getProject(id);
          if (project) openProjectModal(project);
          return;
        }

        if (action === 'delete-project') {
          deleteProject(id);
          return;
        }
      }

      // 点击其他地方关闭下拉菜单
      $$('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        $$('.modal.open').forEach(m => m.classList.remove('open'));
      }
    });
  }

  // ===== 初始化 =====

  function init() {
    initTheme();
    bindEvents();
    renderDashboard();
  }

  // DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
