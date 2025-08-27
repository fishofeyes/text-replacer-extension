// 存储原始文本和元素
let originalTexts = [];
let elements = [];
// 在content.js开头添加初始化检查
console.log('Content script initialized');

// 处理消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "replace") {
        console.log('开始替换文本');
        // ✅ 声明异步响应
        const asyncResponse = true;
        let csv = chrome.storage.local.get('csvData')
        chrome.storage.local.get('csvData', (result) => {
            const csvData = result.csvData;
            const projectId = message.projectId; // 先声明变量
            console.log('接收到替换请求，项目ID:', projectId);
            console.log('当前CSV数据:', csvData);
            const projectMap = csvData.data[projectId];
            // 执行替换逻辑
            const count = performTextReplacement(projectMap);

            // ✅ 改用 sendResponse 返回结果（非嵌套消息）
            sendResponse({ type: "replaceResult", count: 1 });
        });

        return asyncResponse; // 关键！保持通道开放
    }

    if (message.action === "reset") {
        // 恢复原始文本
        elements.forEach((element, index) => {
            if (originalTexts[index]) {
                element.textContent = originalTexts[index];
            }
        });
    }
});

// 文本替换函数
function performTextReplacement(projectMap) {
    let replacementCount = 0;
    console.log('项目map:', projectMap);

    const nodesToReplace = [];
    const container = document.querySelector('.container');
    if (!container) {
        console.warn('未找到容器元素，跳过替换');
        return 0;
    }
    // 创建TreeWalker遍历所有文本节点
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: node =>
                node.parentNode.tagName !== 'SCRIPT' &&
                node.parentNode.tagName !== 'STYLE'
        }
    );

    // 第一阶段：收集节点
    while (walker.nextNode()) {
        const node = walker.currentNode;
        const originalText = node.nodeValue.trim();

        if (originalText && projectMap[originalText]) {
            nodesToReplace.push({
                node,
                text: originalText,
                parent: node.parentNode // 保存父节点引用
            });
        }
    }

    // 第二阶段：批量替换
    nodesToReplace.forEach(({ node, text, parent }) => {
        const wrapper = document.createElement('span');
        wrapper.dataset.originalText = text;
        wrapper.textContent = text + ' -> ' + projectMap[text].name;

        parent.replaceChild(wrapper, node); // 在原始父节点上替换
    });

    // 监听动态内容变化[4](@ref)
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE && projectMap[node.nodeValue.trim()]) {
                        // 动态内容替换
                        const wrapper = document.createElement('span');
                        wrapper.dataset.originalText = node.nodeValue.trim();
                        wrapper.textContent = projectMap[node.nodeValue.trim()].name;
                        node.parentNode.replaceChild(wrapper, node);
                    }
                });
            }
        }
    });

    observer.observe(container, {
        childList: true,
        subtree: true,
        characterData: true
    });
    return replacementCount;
}
