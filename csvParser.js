// 新增：全局存储用户选择的项目ID

// 解析CSV文本并生成数据结构
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const result = {};

    // 获取项目名称列表（第一行的第三列开始）
    const projectNames = [];
    const firstLine = lines[0].split(',');
    for (let i = 3; i < firstLine.length; i++) {
        const projectName = firstLine[i].trim();
        if (projectName) {
            projectNames.push(projectName);
        }
    }

    // 解析每一行数据
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('|事件名称|')) continue;

        const columns = line.split(',');
        if (columns.length < 4) continue;

        const eventName = columns[0].trim(); // 第一列内容
        const enName = columns[1].trim();    // 第二列内容

        // 为每个项目添加数据
        for (let j = 0; j < projectNames.length; j++) {
            const projectName = projectNames[j];
            const key = columns[j + 3] ? columns[j + 3].trim() : null;

            if (!key) continue; // 跳过空值

            if (!result[projectName]) {
                result[projectName] = {};
            }

            result[projectName][key] = {
                name: eventName,
                enName: enName
            };
        }
    }
    return {
        projects: projectNames,
        data: result
    };
}

// 创建下拉列表
function createDropdown(projectNames) {
    const dropdown = document.getElementById('project-dropdown');
    dropdown.innerHTML = ''; // 清空现有选项
    // 添加默认选项
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '请选择项目';
    dropdown.appendChild(defaultOption);

    // 添加项目选项
    projectNames.forEach(project => {
        const option = document.createElement('option');
        option.value = project;
        option.textContent = project;
        dropdown.appendChild(option);
    });
    return dropdown;
}
