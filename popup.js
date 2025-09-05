let currProjectId = null;
let parsedData = null;
// popup.js
document.addEventListener('DOMContentLoaded', () => {
    tableSearch();
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
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "replace",
                projectId: currProjectId
            });
        });
    }
});

document.getElementById('project-dropdown').addEventListener('change', function () {
    if (this.value) {
        currProjectId = this.value;
        if (currProjectId) {
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "replace",
                    projectId: currProjectId
                });
            });
        }

        if (currProjectId) {
            updateAllTables(currProjectId, parsedData);
        } else {
            clearAllTables();
        }
    }
});

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

    const projectParams = projectData.params[project];
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

    const projectParams = projectData.values[project];
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

    // 为事件名称表格添加筛选功能 (搜索原事件名称 enName)
    eventSearchInput.addEventListener('keyup', function () {
        const filterValue = this.value.toLowerCase(); // 获取搜索框的值并转为小写
        const tableBody = document.getElementById('event-table-body');
        const rows = tableBody.getElementsByTagName('tr');

        for (let row of rows) {
            // 获取当前行的第二列单元格，即"原事件名称"列 (索引为1，因为索引从0开始)
            const enNameCell = row.cells[1];
            if (enNameCell) {
                const cellText = enNameCell.textContent.toLowerCase(); // 获取单元格文本并转为小写
                // 如果单元格文本包含搜索关键词，显示该行，否则隐藏
                row.style.display = cellText.includes(filterValue) ? '' : 'none';
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
            if (keyCell) {
                const cellText = keyCell.textContent.toLowerCase();
                row.style.display = cellText.includes(filterValue) ? '' : 'none';
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
            if (keyCell) {
                const cellText = keyCell.textContent.toLowerCase();
                row.style.display = cellText.includes(filterValue) ? '' : 'none';
            }
        }
    });
}
