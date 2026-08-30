/**
 * 数据存储层
 * 基于 localStorage 实现，支持导入导出 JSON 备份
 */

const Store = (function () {
  const STORAGE_KEY = 'project-manager-data';
  const SCHEMA_VERSION = 1;

  // 默认示例数据
  function getDefaultData() {
    const now = new Date().toISOString();
    return {
      version: SCHEMA_VERSION,
      projects: [
        {
          id: 'demo-1',
          name: '示例项目：论文研究',
          description: '这是一个示例项目，展示项目管理的基本功能。你可以删除它并创建自己的项目。',
          status: 'active',
          startDate: '2026-08-01',
          endDate: '2026-12-31',
          members: ['张三', '李四'],
          createdAt: now,
          updatedAt: now
        }
      ],
      tasks: [
        {
          id: 'task-1',
          projectId: 'demo-1',
          title: '文献调研',
          description: '收集并阅读相关领域的核心论文，整理文献综述',
          status: 'done',
          priority: 'high',
          dueDate: '2026-08-15',
          assignee: '张三',
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'task-2',
          projectId: 'demo-1',
          title: '实验设计',
          description: '设计实验方案和对照组，准备实验环境',
          status: 'in-progress',
          priority: 'high',
          dueDate: '2026-09-01',
          assignee: '李四',
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'task-3',
          projectId: 'demo-1',
          title: '数据采集',
          description: '按照实验方案采集数据，做好原始数据备份',
          status: 'todo',
          priority: 'medium',
          dueDate: '2026-09-15',
          assignee: '张三',
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'task-4',
          projectId: 'demo-1',
          title: '撰写论文初稿',
          description: '整理实验结果，撰写论文初稿',
          status: 'todo',
          priority: 'medium',
          dueDate: '2026-10-31',
          assignee: '李四',
          createdAt: now,
          updatedAt: now
        }
      ],
      activities: [
        {
          id: 'act-1',
          type: 'task-complete',
          text: '完成了任务「文献调研」',
          projectId: 'demo-1',
          timestamp: now
        },
        {
          id: 'act-2',
          type: 'project-create',
          text: '创建了项目「示例项目：论文研究」',
          projectId: 'demo-1',
          timestamp: now
        }
      ]
    };
  }

  // 读取数据
  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const defaultData = getDefaultData();
        saveData(defaultData);
        return defaultData;
      }
      const data = JSON.parse(raw);
      if (!data.version || data.version < SCHEMA_VERSION) {
        return migrateData(data);
      }
      return data;
    } catch (e) {
      console.error('加载数据失败:', e);
      const defaultData = getDefaultData();
      saveData(defaultData);
      return defaultData;
    }
  }

  // 保存数据
  function saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('保存数据失败:', e);
      return false;
    }
  }

  // 数据迁移（预留）
  function migrateData(data) {
    if (!data.version) {
      data.version = SCHEMA_VERSION;
    }
    saveData(data);
    return data;
  }

  // 生成 ID
  function genId(prefix = 'id') {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 6);
  }

  // ===== 项目操作 =====

  function getProjects() {
    const data = loadData();
    return data.projects;
  }

  function getProject(id) {
    const data = loadData();
    return data.projects.find(p => p.id === id) || null;
  }

  function addProject(project) {
    const data = loadData();
    const now = new Date().toISOString();
    const newProject = {
      id: genId('project'),
      name: project.name,
      description: project.description || '',
      status: project.status || 'planning',
      startDate: project.startDate || '',
      endDate: project.endDate || '',
      members: project.members || [],
      createdAt: now,
      updatedAt: now
    };
    data.projects.push(newProject);
    addActivity({
      type: 'project-create',
      text: `创建了项目「${newProject.name}」`,
      projectId: newProject.id
    });
    saveData(data);
    return newProject;
  }

  function updateProject(id, updates) {
    const data = loadData();
    const idx = data.projects.findIndex(p => p.id === id);
    if (idx === -1) return null;
    data.projects[idx] = {
      ...data.projects[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    addActivity({
      type: 'project-update',
      text: `更新了项目「${data.projects[idx].name}」`,
      projectId: id
    });
    saveData(data);
    return data.projects[idx];
  }

  function deleteProject(id) {
    const data = loadData();
    const project = data.projects.find(p => p.id === id);
    if (!project) return false;
    data.projects = data.projects.filter(p => p.id !== id);
    data.tasks = data.tasks.filter(t => t.projectId !== id);
    data.activities = data.activities.filter(a => a.projectId !== id);
    saveData(data);
    return true;
  }

  // ===== 任务操作 =====

  function getTasks(projectId = null) {
    const data = loadData();
    if (projectId) {
      return data.tasks.filter(t => t.projectId === projectId);
    }
    return data.tasks;
  }

  function getTask(id) {
    const data = loadData();
    return data.tasks.find(t => t.id === id) || null;
  }

  function addTask(task) {
    const data = loadData();
    const now = new Date().toISOString();
    const newTask = {
      id: genId('task'),
      projectId: task.projectId,
      title: task.title,
      description: task.description || '',
      status: task.status || 'todo',
      priority: task.priority || 'medium',
      dueDate: task.dueDate || '',
      assignee: task.assignee || '',
      createdAt: now,
      updatedAt: now
    };
    data.tasks.push(newTask);
    const project = data.projects.find(p => p.id === task.projectId);
    addActivity({
      type: 'task-create',
      text: `添加了任务「${newTask.title}」`,
      projectId: task.projectId
    });
    saveData(data);
    return newTask;
  }

  function updateTask(id, updates) {
    const data = loadData();
    const idx = data.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    const oldStatus = data.tasks[idx].status;
    data.tasks[idx] = {
      ...data.tasks[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    if (updates.status && updates.status !== oldStatus) {
      const statusText = { 'todo': '待办', 'in-progress': '进行中', 'done': '已完成' };
      addActivity({
        type: 'task-status',
        text: `任务「${data.tasks[idx].title}」状态更新为「${statusText[updates.status] || updates.status}」`,
        projectId: data.tasks[idx].projectId
      });
      if (updates.status === 'done') {
        addActivity({
          type: 'task-complete',
          text: `完成了任务「${data.tasks[idx].title}」`,
          projectId: data.tasks[idx].projectId
        });
      }
    }
    saveData(data);
    return data.tasks[idx];
  }

  function deleteTask(id) {
    const data = loadData();
    const task = data.tasks.find(t => t.id === id);
    if (!task) return false;
    data.tasks = data.tasks.filter(t => t.id !== id);
    saveData(data);
    return true;
  }

  // ===== 动态操作 =====

  function addActivity(activity) {
    const data = loadData();
    const newActivity = {
      id: genId('act'),
      type: activity.type,
      text: activity.text,
      projectId: activity.projectId || null,
      timestamp: new Date().toISOString()
    };
    data.activities.unshift(newActivity);
    if (data.activities.length > 50) {
      data.activities = data.activities.slice(0, 50);
    }
    saveData(data);
    return newActivity;
  }

  function getRecentActivities(limit = 10) {
    const data = loadData();
    return data.activities.slice(0, limit);
  }

  // ===== 统计 =====

  function getStats() {
    const data = loadData();
    const totalProjects = data.projects.length;
    const totalTasks = data.tasks.length;
    const completedTasks = data.tasks.filter(t => t.status === 'done').length;
    const activeProjects = data.projects.filter(p => p.status === 'active').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalProjects,
      activeProjects,
      totalTasks,
      completedTasks,
      completionRate
    };
  }

  function getProjectProgress(projectId) {
    const tasks = getTasks(projectId);
    if (tasks.length === 0) return 0;
    const done = tasks.filter(t => t.status === 'done').length;
    return Math.round((done / tasks.length) * 100);
  }

  // ===== 导入导出 =====

  function exportData() {
    const data = loadData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `project-manager-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.projects || !data.tasks || !data.activities) {
        return { success: false, message: '数据格式不正确' };
      }
      saveData(data);
      return { success: true };
    } catch (e) {
      return { success: false, message: 'JSON 解析失败' };
    }
  }

  // ===== 主题 =====

  function getTheme() {
    return localStorage.getItem('theme') || 'light';
  }

  function setTheme(theme) {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }

  return {
    // 项目
    getProjects,
    getProject,
    addProject,
    updateProject,
    deleteProject,
    // 任务
    getTasks,
    getTask,
    addTask,
    updateTask,
    deleteTask,
    // 动态
    getRecentActivities,
    addActivity,
    // 统计
    getStats,
    getProjectProgress,
    // 导入导出
    exportData,
    importData,
    // 主题
    getTheme,
    setTheme
  };
})();
