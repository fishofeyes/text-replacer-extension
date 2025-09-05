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
// 修改后的Excel数据解析函数
function parseExcelData(excelData) {
    // 根据你的描述，第一行(索引0)可能不是有效数据头，有效数据从第二行(索引1)开始
    // 我们需要确定真正的标题行和数据起始行
    const dataStartRowIndex = 1; // 数据从第二行开始（索引1）

    const projects = excelData[0].slice(2); // 获取项目名称列表
    const result = {};
    // 遍历数据行（从指定的起始行开始）
    for (let i = dataStartRowIndex; i < excelData.length; i++) {
        const row = excelData[i];

        // 跳过空行或无效行
        if (!row || row.length === 0) continue;
        // 添加项目下的所有数据（从第二列开始）
        for (let j = 2; j < row.length; j++) {
            const eventName = row[0].trim(); // 第一列内容
            const enName = row[1].trim();    // 第二列内容
            const projectName = projects[j - 2];
            if (!result[projectName]) {
                result[projectName] = {};
            }
            if (row[j] !== null && row[j] !== undefined && row[j] !== '') {
                const key = row[j].trim();
                result[projectName][key] = { name: eventName, enName: enName }
            }
        }
    }

    // 解析参数名
    return { projects, result };
}

// parase excel params 
function parseExcelParams(excelData) {
    const params = {};
    const projects = excelData[0].slice(1); //
    // 遍历数据行（从第二行开始，假设第一行是标题）
    for (let i = 1; i < excelData.length; i++) {
        const row = excelData[i];
        if (!row || row.length === 0) continue;

        const pName = row[0].trim(); // 第一列内容

        for (let j = 1; j < row.length; j++) {
            const projectName = projects[j - 1];
            if (!params[projectName]) {
                params[projectName] = {};
            }
            params[projectName][pName] = (row[j] ?? "-").trim();
        }

    }
    return params;
}

function parseValuesData(excelData) {
    const values = {};
    const projects = excelData[0].slice(1); //
    // 遍历数据行（从第二行开始，假设第一行是标题）
    for (let i = 1; i < excelData.length; i++) {
        const row = excelData[i];
        if (!row || row.length === 0) continue;

        const pName = row[0].trim(); // 第一列内容

        for (let j = 1; j < row.length; j++) {
            const projectName = projects[j - 1];
            if (!values[projectName]) {
                values[projectName] = {};
            }
            values[projectName][pName] = (row[j] ?? "-").trim();
        }
    }
    return values;
}
// 创建下拉列表
function createDropdown(projectNames) {
    console.log('Creating dropdown with projects:', projectNames);
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
