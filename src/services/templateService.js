const fs = require('fs-extra');
const path = require('path');

function readTemplate(templateName) {
  try {
    const templatePath = path.join(__dirname, '../../templates', `${templateName}.html`);
    if (fs.existsSync(templatePath)) {
      return fs.readFileSync(templatePath, 'utf-8');
    }
  } catch (error) {
    console.error(`读取模板 ${templateName} 失败:`, error);
  }
  return '';
}

function renderTemplate(template, data) {
  let rendered = template;
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, data[key]);
  });
  return rendered;
}

module.exports = {
  readTemplate,
  renderTemplate
};
