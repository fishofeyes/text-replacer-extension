// 监听插件安装事件
console.log("Background script loaded")
chrome.runtime.onInstalled.addListener(() => {
    console.log('文本替换工具已安装');
    // 初始化存储
});
chrome.action.onClicked.addListener((tab) => {
    console.log('插件图标被点击，打开弹出页面');
});

