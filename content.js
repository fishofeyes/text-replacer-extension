// 存储原始文本和元素
let projectMap = null;
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
            projectMap = csvData.data[projectId];
            // 执行替换逻辑
            const count = performTextReplacement();

            // ✅ 改用 sendResponse 返回结果（非嵌套消息）
            sendResponse({ type: "replaceResult", count: 1 });
        });

        return asyncResponse; // 关键！保持通道开放
    }
});

// 文本替换函数
function performTextReplacement() {
    let replacementCount = 0;
    console.log('项目map:', projectMap);

    const nodesToReplace = [];
    const container = document.querySelector('.container');
    if (container) {
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
    }
    // 阶段2：处理特定 <span> 的文本节点
    // 阶段2：处理特定 <span> 的文本节点
    // const buttonSpans = document.querySelectorAll('span.n-button__content');
    // buttonSpans.forEach(span => {
    //     // 定位注释节点前的文本节点
    //     const textNode = [...span.childNodes].find(node =>
    //         node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== ""
    //     );

    //     if (textNode) {
    //         const originalText = textNode.textContent.trim();
    //         if (projectMap[originalText]) {
    //             nodesToReplace.push({
    //                 node: textNode,
    //                 text: originalText,
    //                 parent: span // 父节点为 span 本身
    //             });
    //         }
    //     }
    // });

    // 第二阶段：批量替换
    nodesToReplace.forEach(({ node, text, parent }) => {
        const wrapper = document.createElement('span');
        wrapper.dataset.originalText = text;
        wrapper.textContent = text + ' -> ' + projectMap[text].name;

        parent.replaceChild(wrapper, node); // 在原始父节点上替换
    });
    return replacementCount;
}

function handleContainer(container) {
    performTextReplacement();
}

// 监听动态新增
const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const container = node.matches('.container')
                        ? node
                        : node.querySelector('.container');
                    if (container) handleContainer(container);
                }
            });
        }
    });
});

// 检测初始元素
document.querySelectorAll('.container').forEach(handleContainer);

// 启动监听
observer.observe(document.body, {
    childList: true,
    subtree: true
});
