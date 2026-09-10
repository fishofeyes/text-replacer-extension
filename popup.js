let currProjectId = null;
let parsedData = null;
// popup.js
document.addEventListener('DOMContentLoaded', () => {
    tableSearch();
    initCopyButtons();
    initProjectCombobox();
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('csvFile');
    const replaceStatus = document.getElementById('replaceStatus');

    // 点击拖拽区域触发文件选择
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // 拖拽事件处理
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length === 0) return;

        // 检查文件类型
        const file = files[0];
        // 处理文件
        handleFile(file);
    });

    // 文件选择变化事件
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length === 0) return;
        handleFile(e.target.files[0]);
    });

    const tabButtons = document.querySelectorAll('.tab-btn');
    const tableContainers = document.querySelectorAll('.table-container');

    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            const targetTab = this.getAttribute('data-tab');

            // 更新按钮状态
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            // 更新表格显示状态
            tableContainers.forEach(container => {
                container.classList.remove('active');
                if (container.id === targetTab) {
                    container.classList.add('active');
                }
            });
        });
    });


    // 文件处理函数
    function handleFile(file) {
        replaceStatus.textContent = `已选择: ${file.name}`;
        replaceStatus.style.color = 'green';

        // 检查文件类型
        const fileType = file.name.split('.').pop().toLowerCase();
        const isExcel = fileType === 'xlsx' || fileType === 'xls';
        const isCSV = fileType === 'csv';

        if (!isExcel && !isCSV) {
            replaceStatus.textContent = '请选择CSV或Excel文件';
            replaceStatus.style.color = 'red';
            return;
        }

        const reader = new FileReader();

        reader.onload = function (e) {
            try {
                const data = e.target.result;
                if (isExcel) {
                    // 读取Excel文件
                    const workbook = XLSX.read(data, { type: 'binary' });

                    // 获取第一个工作表
                    for (let i = 0; i < workbook.SheetNames.length; i++) {
                        const firstSheetName = workbook.SheetNames[i];
                        const worksheet = workbook.Sheets[firstSheetName];

                        // 将工作表转换为JSON
                        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                        switch (i) {
                            case 0:
                                parsedData = parseExcelData(jsonData);
                                break;
                            case 1:
                                // 这里可以处理第二个工作表的数据
                                // 例如，存储参数名和参数值
                                parsedData["params"] = parseExcelParams(jsonData);

                                break;
                            case 2:
                                parsedData["values"] = parseValuesData(jsonData);
                                break;
                            // 转换为与原来CSV解析函数相同的格式
                            default:
                                break;
                        }
                    }

                } else {
                    // 原有的CSV处理逻辑
                    const csvText = e.target.result;
                    parsedData = parseCSV(csvText);
                }
                console.log('Parsed Data:', parsedData);
                // 清空并重新创建下拉列表
                createDropdown(parsedData.projects);

                // 存储解析结果以便后续使用
                chrome.storage.local.set({ csvData: parsedData.result });

                replaceStatus.textContent = '文件解析成功！';
            } catch (error) {
                console.error('解析错误:', error);
                replaceStatus.textContent = '文件解析失败: ' + error.message;
                replaceStatus.style.color = 'red';
            }
        };

        reader.onerror = function () {
            replaceStatus.textContent = '文件读取失败';
            replaceStatus.style.color = 'red';
        };

        // 根据文件类型选择读取方式
        if (isExcel) {
            reader.readAsBinaryString(file);
        } else {
            reader.readAsText(file);
        }
    }
});


document.getElementById('resetBtn').addEventListener('click', () => {
    if (currProjectId) {
        sendReplaceMessage(currProjectId);
    }
});

// ==================== 项目选择：可搜索下拉框 ====================
// 全局下拉框状态
let projectOptions = [];      // 全部项目名
let filteredProjects = [];    // 当前搜索过滤后的项目名
let activeProjectIndex = -1;  // 键盘高亮项索引

function getProjectInput() {
    return document.getElementById('project-search');
}

// 初始化项目下拉框（既能搜索，也能点选）
function initProjectCombobox() {
    const input = getProjectInput();
    const listEl = document.getElementById('project-list');
    if (!input || !listEl) return;

    // 聚焦：展示全部项目，并全选文本，方便直接输入关键词替换
    input.addEventListener('focus', () => {
        activeProjectIndex = -1;
        openProjectList('');
        input.select();
    });

    // 输入：实时过滤
    input.addEventListener('input', () => {
        activeProjectIndex = -1;
        openProjectList(input.value);
        updateClearButton();
    });

    // 键盘操作：上下移动、回车选中、Esc 取消
    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (listEl.hidden) openProjectList(input.value);
            moveActiveProject(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (listEl.hidden) openProjectList(input.value);
            moveActiveProject(-1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredProjects[activeProjectIndex]) {
                selectProject(filteredProjects[activeProjectIndex]);
            } else {
                // 没有高亮项时，若输入的内容正好是某个项目名则直接选中
                const exact = findExactProject(input.value);
                if (exact) selectProject(exact);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeProjectList();
            input.value = currProjectId || '';
            updateClearButton();
            input.blur();
        }
    });

    // 失焦：延时关闭，保证列表项的点击事件先触发
    input.addEventListener('blur', () => {
        setTimeout(() => {
            if (document.activeElement === input) return;
            closeProjectList();
            const typed = input.value.trim();
            const exact = findExactProject(typed);
            if (exact && exact !== currProjectId) {
                selectProject(exact);
                return;
            }
            // 输入内容不是有效项目时，恢复成当前已选项目
            input.value = currProjectId || '';
            updateClearButton();
        }, 150);
    });

    // 点击列表时不希望输入框失焦
    listEl.addEventListener('mousedown', (e) => e.preventDefault());

    // 点选项目
    listEl.addEventListener('click', (e) => {
        const item = e.target.closest('li[data-project]');
        if (!item) return;
        selectProject(item.dataset.project);
    });

    // 清除按钮：取消当前选择
    const clearBtn = document.getElementById('project-clear');
    if (clearBtn) {
        clearBtn.addEventListener('mousedown', (e) => e.preventDefault());
        clearBtn.addEventListener('click', () => {
            selectProject(null);
            input.focus();
            activeProjectIndex = -1;
            openProjectList('');
        });
    }

    // 点击下拉框外部时收起列表
    document.addEventListener('click', (e) => {
        const container = document.getElementById('dropdown-container');
        if (container && !container.contains(e.target)) closeProjectList();
    });

    renderProjectList('');
    updateClearButton();
}

// createDropdown() 调用这里，写入项目列表
function setProjectOptions(projectNames) {
    projectOptions = Array.from(new Set((projectNames || [])
        .map(name => (name === null || name === undefined) ? '' : String(name).trim())
        .filter(Boolean)));

    // 已选项目不在新列表中时清除选择
    if (currProjectId && !projectOptions.includes(currProjectId)) {
        selectProject(null);
    } else {
        const input = getProjectInput();
        if (input) input.value = currProjectId || '';
    }

    const input = getProjectInput();
    if (input && document.activeElement === input) {
        activeProjectIndex = -1;
        openProjectList(input.value);
    } else {
        closeProjectList();
        renderProjectList('');
    }
    updateClearButton();
}

function openProjectList(keyword) {
    const input = getProjectInput();
    const listEl = document.getElementById('project-list');
    const container = document.getElementById('dropdown-container');
    if (!input || !listEl) return;

    renderProjectList(keyword === undefined ? input.value : keyword);
    listEl.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    if (container) container.classList.add('open');
}

function closeProjectList() {
    const input = getProjectInput();
    const listEl = document.getElementById('project-list');
    const container = document.getElementById('dropdown-container');
    if (listEl) listEl.hidden = true;
    activeProjectIndex = -1;
    if (input) input.setAttribute('aria-expanded', 'false');
    if (container) container.classList.remove('open');
}

// 根据关键词渲染项目列表
function renderProjectList(keyword) {
    const listEl = document.getElementById('project-list');
    if (!listEl) return;

    const kw = (keyword || '').trim().toLowerCase();
    filteredProjects = kw
        ? projectOptions.filter(name => name.toLowerCase().includes(kw))
        : projectOptions.slice();

    // 只有一个匹配项时直接高亮，方便搜完直接回车选中
    if (filteredProjects.length === 1) {
        activeProjectIndex = 0;
    } else if (activeProjectIndex >= filteredProjects.length) {
        activeProjectIndex = -1;
    }

    listEl.innerHTML = '';

    if (filteredProjects.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'project-empty';
        empty.textContent = projectOptions.length > 0 ? '没有匹配的项目' : '请先导入文件';
        listEl.appendChild(empty);
        return;
    }

    filteredProjects.forEach((name, index) => {
        const item = document.createElement('li');
        item.className = 'project-item';
        item.dataset.project = name;
        item.setAttribute('role', 'option');
        if (name === currProjectId) {
            item.classList.add('selected');
            item.setAttribute('aria-selected', 'true');
        }
        if (index === activeProjectIndex) item.classList.add('active');
        item.innerHTML = highlightMatch(name, kw);
        listEl.appendChild(item);
    });
}

// 键盘上下移动高亮项
function moveActiveProject(delta) {
    if (filteredProjects.length === 0) return;

    if (activeProjectIndex < 0) {
        activeProjectIndex = delta > 0 ? 0 : filteredProjects.length - 1;
    } else {
        activeProjectIndex = (activeProjectIndex + delta + filteredProjects.length) % filteredProjects.length;
    }

    const items = document.querySelectorAll('#project-list .project-item');
    items.forEach((item, index) => item.classList.toggle('active', index === activeProjectIndex));

    const active = items[activeProjectIndex];
    if (active && active.scrollIntoView) {
        active.scrollIntoView({ block: 'nearest' });
    }
}

// 输入内容是否正好等于某个项目名
function findExactProject(text) {
    const value = (text || '').trim().toLowerCase();
    if (!value) return null;
    return projectOptions.find(name => name.toLowerCase() === value) || null;
}

// 高亮匹配到的关键词
function highlightMatch(name, keyword) {
    const safeName = escapeHtml(name);
    if (!keyword) return safeName;

    const index = name.toLowerCase().indexOf(keyword);
    if (index < 0) return safeName;

    return escapeHtml(name.slice(0, index))
        + '<mark>' + escapeHtml(name.slice(index, index + keyword.length)) + '</mark>'
        + escapeHtml(name.slice(index + keyword.length));
}

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[ch]));
}

function updateClearButton() {
    const clearBtn = document.getElementById('project-clear');
    if (!clearBtn) return;
    const input = getProjectInput();
    const hasText = !!(input && input.value.trim());
    clearBtn.hidden = !currProjectId && !hasText;
}

// 选中项目：更新状态、通知页面替换、刷新三张表格
function selectProject(projectName) {
    currProjectId = projectName || null;

    const input = getProjectInput();
    if (input) input.value = currProjectId || '';

    closeProjectList();

    const container = document.getElementById('dropdown-container');
    if (container) container.classList.toggle('has-selection', !!currProjectId);

    if (currProjectId) {
        sendReplaceMessage(currProjectId);
        if (parsedData) {
            updateAllTables(currProjectId, parsedData);
        } else {
            clearAllTables();
        }
    } else {
        clearAllTables();
    }

    updateClearButton();
}

// 通知页面执行文本替换
function sendReplaceMessage(projectId) {
    if (!projectId) return;
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (!tabs || tabs.length === 0 || tabs[0].id === undefined) return;
        chrome.tabs.sendMessage(tabs[0].id, { action: "replace", projectId }, () => {
            // 读掉 lastError，避免在当前页面没有 content script 时报连接错误
            void chrome.runtime.lastError;
        });
    });
}

// 更新所有表格
function updateAllTables(project, projectData) {
    updateEventTable(project, projectData);
    updateParamTable(project, projectData);
    updateValueTable(project, projectData);
}

// 清空所有表格
function clearAllTables() {
    document.getElementById('event-table-body').innerHTML = '';
    document.getElementById('param-table-body').innerHTML = '';
    document.getElementById('value-table-body').innerHTML = '';

    document.getElementById('event-no-data').style.display = 'block';
    document.getElementById('param-no-data').style.display = 'block';
    document.getElementById('value-no-data').style.display = 'block';
}


function updateEventTable(project, projectData) {
    const eventTableBody = document.getElementById('event-table-body');
    const noDataMsg = document.getElementById('event-no-data');
    eventTableBody.innerHTML = '';
    const projectEvents = projectData.result[project];
    if (projectEvents && Object.keys(projectEvents).length > 0) {
        noDataMsg.style.display = 'none';
        for (const [obfuscated, data] of Object.entries(projectEvents)) {
            const row = document.createElement('tr');
            row.innerHTML = `
                            <td>${data.name}</td>
                            <td>${data.enName}</td>
                            <td>${obfuscated}</td>
                        `;
            eventTableBody.appendChild(row);
        }
    } else {
        noDataMsg.style.display = 'block';
    }
}

// 更新参数名称表格
function updateParamTable(project, projectData) {
    const paramTableBody = document.getElementById('param-table-body');
    const noDataMsg = document.getElementById('param-no-data');
    paramTableBody.innerHTML = '';

    const projectParams = (projectData.params || {})[project];
    if (projectParams && Object.keys(projectParams).length > 0) {
        noDataMsg.style.display = 'none';
        for (const [paramName, obfuscated] of Object.entries(projectParams)) {
            const row = document.createElement('tr');
            row.innerHTML = `
                            <td>${paramName}</td>
                            <td>${obfuscated}</td>
                        `;
            paramTableBody.appendChild(row);
        }
    } else {
        noDataMsg.style.display = 'block';
    }
}

// 更新上报参数值表格
function updateValueTable(project, projectData) {
    const valueTableBody = document.getElementById('value-table-body');
    const noDataMsg = document.getElementById('value-no-data');
    valueTableBody.innerHTML = '';

    const projectParams = (projectData.values || {})[project];
    if (projectParams && Object.keys(projectParams).length > 0) {
        noDataMsg.style.display = 'none';
        for (const [paramName, obfuscated] of Object.entries(projectParams)) {
            const row = document.createElement('tr');
            row.innerHTML = `
                            <td>${paramName}</td>
                            <td>${obfuscated}</td>
                        `;
            valueTableBody.appendChild(row);
        }
    } else {
        noDataMsg.style.display = 'block';
    }
}


// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "scanResult") {
        document.getElementById('scanStatus').textContent =
            `找到 ${message.count} 个可替换元素`;
    }
    if (message.type === "replaceResult") {
        document.getElementById('replaceStatus').textContent =
            `已替换 ${message.count} 个元素`;
    }
});


// search功能
function tableSearch() {
    // 获取三个搜索框元素
    const eventSearchInput = document.getElementById('event-search');
    const paramSearchInput = document.getElementById('param-search');
    const valueSearchInput = document.getElementById('value-search');

    const eventSearchInputTag = document.getElementById('event-tag');
    const paramSearchInputTag = document.getElementById('param-tag');
    const valueSearchInputTag = document.getElementById('value-tag');

    // 为事件名称表格添加筛选功能 (搜索原事件名称 enName)
    eventSearchInput.addEventListener('keyup', function () {
        const filterValue = this.value.toLowerCase(); // 获取搜索框的值并转为小写
        const tableBody = document.getElementById('event-table-body');
        const rows = tableBody.getElementsByTagName('tr');

        for (let row of rows) {
            // 获取当前行的第二列单元格，即"原事件名称"列 (索引为1，因为索引从0开始)
            const enNameCell = row.cells[1];
            const enNameCell2 = row.cells[2];
            var show = false;
            if (enNameCell2) {
                const cellText = enNameCell2.textContent.toLowerCase(); // 获取单元格文本并转为小写
                show = cellText.includes(filterValue)
            }
            if (enNameCell) {
                const cellText = enNameCell.textContent.toLowerCase(); // 获取单元格文本并转为小写
                // 如果单元格文本包含搜索关键词，显示该行，否则隐藏
                row.style.display = (cellText.includes(filterValue) || show) ? '' : 'none';
            }
        }
    });

    // 为参数名称表格添加筛选功能 (搜索原参数名 key)
    paramSearchInput.addEventListener('keyup', function () {
        const filterValue = this.value.toLowerCase();
        const tableBody = document.getElementById('param-table-body');
        const rows = tableBody.getElementsByTagName('tr');

        for (let row of rows) {
            // 获取当前行的第一列单元格，即"原参数名"列 (索引为0)
            const keyCell = row.cells[0];
            const keyCell2 = row.cells[1];
            var show = false;
            if (keyCell2) {
                const cellText = keyCell2.textContent.toLowerCase(); // 获取单元格文本并转为小写
                show = cellText.includes(filterValue)
            }
            if (keyCell) {
                const cellText = keyCell.textContent.toLowerCase();
                row.style.display = (cellText.includes(filterValue) || show) ? '' : 'none';
            }
        }
    });

    // 为上报参数值表格添加筛选功能 (搜索上报参数名 key)
    valueSearchInput.addEventListener('keyup', function () {
        const filterValue = this.value.toLowerCase();
        const tableBody = document.getElementById('value-table-body');
        const rows = tableBody.getElementsByTagName('tr');

        for (let row of rows) {
            // 获取当前行的第一列单元格，即"上报参数名"列 (索引为0)
            const keyCell = row.cells[0];
            const keyCell2 = row.cells[1];
            var show = false;
            if (keyCell2) {
                const cellText = keyCell2.textContent.toLowerCase(); // 获取单元格文本并转为小写
                show = cellText.includes(filterValue)
            }
            if (keyCell) {
                const cellText = keyCell.textContent.toLowerCase();
                row.style.display = (cellText.includes(filterValue) || show) ? '' : 'none';
            }
        }
    });

    // 为事件名称表格添加筛选功能 (搜索原事件名称 enName)
    eventSearchInputTag.addEventListener('keyup', function () {
        const filterValue = this.value.toLowerCase(); // 获取搜索框的值并转为小写
        const tableBody = document.getElementById('event-table-body');
        const rows = tableBody.getElementsByTagName('tr');
        // 如果输入为空，显示所有行并重置颜色
        if (filterValue === '') {
            for (let row of rows) {
                row.style.backgroundColor = ''; // 重置背景色
            }
            return;
        }
        const tags = filterValue.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

        for (let row of rows) {
            const enNameCell = row.cells[1]; // 原事件名称列
            const enNameCell2 = row.cells[2]; // 第二列（根据您的代码）
            let matchFound = false;

            // 检查两列中是否有任意一个单元格的值完全等于任一标签
            if (enNameCell || enNameCell2) {
                const cell1Text = enNameCell ? enNameCell.textContent.toLowerCase().trim() : '';
                const cell2Text = enNameCell2 ? enNameCell2.textContent.toLowerCase().trim() : '';

                // 检查是否完全匹配任一标签
                matchFound = tags.some(tag =>
                    cell1Text === tag || cell2Text === tag
                );
            }

            // 根据匹配结果设置行的显示和颜色
            if (matchFound) {
                row.style.backgroundColor = '#ffcccc'; // 设置红色背景
            } else {
                row.style.backgroundColor = ''; // 重置背景色
            }
        }
    });

    paramSearchInputTag.addEventListener('keyup', function () {
        const filterValue = this.value.toLowerCase(); // 获取搜索框的值并转为小写
        const tableBody = document.getElementById('param-table-body');
        const rows = tableBody.getElementsByTagName('tr');
        // 如果输入为空，显示所有行并重置颜色
        if (filterValue === '') {
            for (let row of rows) {
                row.style.backgroundColor = ''; // 重置背景色
            }
            return;
        }
        const tags = filterValue.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

        for (let row of rows) {
            const enNameCell = row.cells[0]; // 原事件名称列
            const enNameCell2 = row.cells[1]; // 第二列（根据您的代码）
            let matchFound = false;

            // 检查两列中是否有任意一个单元格的值完全等于任一标签
            if (enNameCell || enNameCell2) {
                const cell1Text = enNameCell ? enNameCell.textContent.toLowerCase().trim() : '';
                const cell2Text = enNameCell2 ? enNameCell2.textContent.toLowerCase().trim() : '';

                // 检查是否完全匹配任一标签
                matchFound = tags.some(tag =>
                    cell1Text === tag || cell2Text === tag
                );
            }

            // 根据匹配结果设置行的显示和颜色
            if (matchFound) {
                row.style.backgroundColor = '#ffcccc'; // 设置红色背景
            } else {
                row.style.backgroundColor = ''; // 重置背景色
            }
        }
    });

    valueSearchInputTag.addEventListener('keyup', function () {
        const filterValue = this.value.toLowerCase(); // 获取搜索框的值并转为小写
        const tableBody = document.getElementById('value-table-body');
        const rows = tableBody.getElementsByTagName('tr');
        // 如果输入为空，显示所有行并重置颜色
        if (filterValue === '') {
            for (let row of rows) {
                row.style.backgroundColor = ''; // 重置背景色
            }
            return;
        }
        const tags = filterValue.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

        for (let row of rows) {
            const enNameCell = row.cells[0]; // 原事件名称列
            const enNameCell2 = row.cells[1]; // 第二列（根据您的代码）
            let matchFound = false;

            // 检查两列中是否有任意一个单元格的值完全等于任一标签
            if (enNameCell || enNameCell2) {
                const cell1Text = enNameCell ? enNameCell.textContent.toLowerCase().trim() : '';
                const cell2Text = enNameCell2 ? enNameCell2.textContent.toLowerCase().trim() : '';

                // 检查是否完全匹配任一标签
                matchFound = tags.some(tag =>
                    cell1Text === tag || cell2Text === tag
                );
            }

            // 根据匹配结果设置行的显示和颜色
            if (matchFound) {
                row.style.backgroundColor = '#ffcccc'; // 设置红色背景
            } else {
                row.style.backgroundColor = ''; // 重置背景色
            }
        }
    });
}

// 生成随机字符串（5-10位字母数字）
function generateRandomString() {
    const length = Math.floor(Math.random() * 6) + 5; // 5-10位
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}



// 将事件名称转换为Dart枚举名
function toDartEnumName(eventName) {
    if (!eventName) return '';

    // 移除特殊字符，用下划线连接
    return eventName
        .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
        .toLowerCase();
}

function insertRandomToEnumName(baseName) {
    if (!baseName) return '';

    const randomStr = generateRandomString();
    const insertPosition = Math.floor(baseName.length / 2);

    // 在中间位置插入随机字符串
    return baseName.slice(0, insertPosition) + randomStr + baseName.slice(insertPosition);
}


// 复制当前表格为Dart枚举
function copyCurrentTableAsDartEnum() {
    // 获取当前激活的标签
    const activeTab = document.querySelector('.tab-btn.active');
    if (!activeTab) return;

    const tableType = activeTab.getAttribute('data-tab');
    let rows, enumNamePrefix;

    // 根据表格类型确定对应的元素
    switch (tableType) {
        case 'event-table':
            rows = Array.from(document.querySelectorAll('#event-table-body tr')).filter(row =>
                row.style.display !== 'none' && row.offsetParent !== null
            );
            enumNamePrefix = 'Event';
            break;
        case 'param-table':
            rows = Array.from(document.querySelectorAll('#param-table-body tr')).filter(row =>
                row.style.display !== 'none' && row.offsetParent !== null
            );
            enumNamePrefix = 'Param';
            break;
        case 'value-table':
            rows = Array.from(document.querySelectorAll('#value-table-body tr')).filter(row =>
                row.style.display !== 'none' && row.offsetParent !== null
            );
            enumNamePrefix = 'Value';
            break;
    }

    if (rows.length === 0) {
        alert('当前表格没有数据');
        return;
    }

    // 构建Dart枚举代码
    let dartCode = `enum ${enumNamePrefix}Enum {\n`;
    const usedEnumNames = new Set(); // 避免枚举名重复

    rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'));

        if (tableType === 'event-table' && cells.length >= 3) {
            // 事件表格：有3列
            const originalName = cells[1].textContent.trim(); // 原事件名称
            const obfuscatedValue = cells[2].textContent.trim(); // 混淆值
            const eventName = cells[0].textContent.trim(); // 用于注释

            if (originalName && obfuscatedValue) {
                // 生成枚举名：原事件名称 + 随机数
                let baseEnumName = toDartEnumName(originalName);
                if (!baseEnumName) {
                    baseEnumName = toDartEnumName(eventName) || 'event';
                }

                let finalEnumName = insertRandomToEnumName(baseEnumName);

                // 确保枚举名唯一
                let counter = 1;
                while (usedEnumNames.has(finalEnumName)) {
                    finalEnumName = `${baseEnumName}_${randomStr}_${counter}`;
                    counter++;
                }
                usedEnumNames.add(finalEnumName);

                dartCode += `  ${finalEnumName}("${obfuscatedValue}"), // ${eventName}\n`;
            }
        } else if ((tableType === 'param-table' || tableType === 'value-table') && cells.length >= 2) {
            // 参数表格和参数值表格：有2列
            const keyName = cells[0].textContent.trim(); // 原参数名/上报参数名
            const obfuscatedValue = cells[1].textContent.trim(); // 混淆值

            if (keyName && obfuscatedValue) {
                // 生成枚举名：参数名 + 随机数
                let baseEnumName = toDartEnumName(keyName);
                if (!baseEnumName) {
                    baseEnumName = 'param';
                }


                let finalEnumName = insertRandomToEnumName(baseEnumName);

                // 确保枚举名唯一
                let counter = 1;
                while (usedEnumNames.has(finalEnumName)) {
                    finalEnumName = `${baseEnumName}_${randomStr}_${counter}`;
                    counter++;
                }
                usedEnumNames.add(finalEnumName);

                dartCode += `  ${finalEnumName}("${obfuscatedValue}"), // ${keyName}\n`;
            }
        }
    });

    // 移除最后一个逗号
    dartCode = dartCode.trim();
    if (dartCode.endsWith(',')) {
        dartCode = dartCode.slice(0, -1);
    }

    dartCode += `\n\n  final String value;\n\n  const ${enumNamePrefix}Enum(this.value);\n}`;

    // 复制到剪贴板
    navigator.clipboard.writeText(dartCode).then(() => {
        const copyBtn = document.getElementById('copy-current-table');
        const originalText = copyBtn.textContent;

        copyBtn.textContent = 'Copy successed ✓';
        copyBtn.style.backgroundColor = '#17a2b8';

        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.backgroundColor = '#28a745';
        }, 1500);

    }).catch(err => {
        console.error('复制失败: ', err);
        alert('复制失败，请手动复制');
    });
}

// 初始化复制按钮
function initCopyButtons() {
    const copyBtn = document.getElementById('copy-current-table');
    if (copyBtn) {
        copyBtn.addEventListener('click', copyCurrentTableAsDartEnum);
    }
}