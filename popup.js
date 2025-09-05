let currProjectId = null;
// popup.js
console.log('Popup script loaded');
document.addEventListener('DOMContentLoaded', () => {
    console.log('Popup DOM fully loaded and parsed');
    chrome.storage.local.get('csvMap', (result) => {
        console.log('已有存储的CSV映射，更新下拉列表', result.csvMap);
        if (result.csvMap) {
            // 2. 更新下拉列表（若需展示）
            createDropdown(result.csvMap.projects)
        }
    });

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
                let parsedData;

                if (isExcel) {
                    // 读取Excel文件
                    const workbook = XLSX.read(data, { type: 'binary' });

                    // 获取第一个工作表
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];

                    // 将工作表转换为JSON
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    // 转换为与原来CSV解析函数相同的格式
                    parsedData = parseExcelData(jsonData);
                } else {
                    // 原有的CSV处理逻辑
                    const csvText = e.target.result;
                    parsedData = parseCSV(csvText);
                }
                console.log('Parsed Data:', parsedData);
                // 清空并重新创建下拉列表
                createDropdown(parsedData.projects);

                // 存储解析结果以便后续使用
                chrome.storage.local.set({ csvData: parsedData });

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
    }
});

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

