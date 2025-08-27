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
});


document.getElementById('replaceBtn').addEventListener('click', () => {
    const fileInput = document.getElementById('csvFile');
    if (fileInput.files.length === 0) {
        document.getElementById('replaceStatus').textContent = '请先选择CSV文件';
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        const csvText = e.target.result;
        const parsedData = parseCSV(csvText);
        // 清空并重新创建下拉列表
        createDropdown(parsedData.projects)

        // 存储解析结果以便后续使用
        chrome.storage.local.set({ csvData: parsedData });
    };

    reader.readAsText(file);
});

document.getElementById('resetBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "reset" });
    });
});

document.getElementById('project-dropdown').addEventListener('change', function () {
    if (this.value) {

        if (this.value) {
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "replace",
                    projectId: this.value
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

