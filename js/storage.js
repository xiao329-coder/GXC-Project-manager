const Storage = {
  KEY: 'gxc_pm_data',
  THEME_KEY: 'gxc_pm_theme',

  defaultData: {
    tasks: [
      {
        id: 't1',
        title: '文献调研',
        description: '调研深度学习在医学图像分割中的最新方法',
        projectName: '医学图像分割',
        status: 'done',
        priority: 'high',
        assignee: '张三',
        dueDate: '2026-09-15',
        createdDate: '2026-09-01',
        progress: 100,
        notes: '已完成U-Net++、TransUNet等方法调研，确定以TransUNet为基线模型'
      },
      {
        id: 't2',
        title: '数据集预处理',
        description: '对ISIC数据集进行清洗、增强和划分',
        projectName: '医学图像分割',
        status: 'in-progress',
        priority: 'high',
        assignee: '李四',
        dueDate: '2026-09-25',
        createdDate: '2026-09-10',
        progress: 60,
        notes: '数据增强方式（翻转、旋转）已实现，正在处理边界标注不连续问题'
      },
      {
        id: 't3',
        title: '模型训练与调参',
        description: '使用TransUNet进行训练，调优学习率和batch size',
        projectName: '医学图像分割',
        status: 'todo',
        priority: 'medium',
        assignee: '张三',
        dueDate: '2026-10-10',
        createdDate: '2026-09-18',
        progress: 0,
        notes: ''
      },
      {
        id: 't4',
        title: '论文撰写 - Introduction',
        description: '撰写论文引言部分，梳理研究背景和动机',
        projectName: '论文撰写',
        status: 'in-progress',
        priority: 'medium',
        assignee: '王五',
        dueDate: '2026-09-30',
        createdDate: '2026-09-15',
        progress: 40,
        notes: '需要补充更多相关工作对比，引言逻辑需要调整'
      },
      {
        id: 't5',
        title: '实验对比',
        description: '与U-Net、U-Net++、DeepLabV3+进行性能对比',
        projectName: '论文撰写',
        status: 'todo',
        priority: 'high',
        assignee: '李四',
        dueDate: '2026-10-05',
        createdDate: '2026-09-20',
        progress: 0,
        notes: ''
      },
      {
        id: 't6',
        title: '消融实验',
        description: '验证各模块（注意力机制、跳跃连接）的有效性',
        projectName: '论文撰写',
        status: 'done',
        priority: 'low',
        assignee: '张三',
        dueDate: '2026-09-18',
        createdDate: '2026-09-05',
        progress: 100,
        notes: '已完成注意力模块和跳跃连接的消融实验，结果证明注意力模块提升2.3% Dice'
      }
    ]
  },

  getData() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Parse error:', e);
    }
    return JSON.parse(JSON.stringify(this.defaultData));
  },

  saveData(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  getTasks() {
    return this.getData().tasks || [];
  },

  saveTasks(tasks) {
    const data = this.getData();
    data.tasks = tasks;
    this.saveData(data);
  },

  getTheme() {
    return localStorage.getItem(this.THEME_KEY) || 'light';
  },

  setTheme(theme) {
    localStorage.setItem(this.THEME_KEY, theme);
  },

  exportData() {
    return JSON.stringify(this.getData(), null, 2);
  },

  importData(jsonStr) {
    const data = JSON.parse(jsonStr);
    this.saveData(data);
    return data;
  },

  generateId() {
    return 't_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  },

  getProjects() {
    const tasks = this.getTasks();
    return [...new Set(tasks.map(t => t.projectName).filter(Boolean))];
  }
};
