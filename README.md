# 招聘手机号助手

油猴脚本：点击手机号框旁的 **ϟ**，填写预设手机号并点击一次“获取验证码”，60 秒内防止重复点击。

- 支持北森登录页和 Moka 招聘手机号登录弹窗，包括企业自定义域名；按平台标识和弹窗结构识别。
- Moka 页面点击 **ϟ** 时还会勾选《隐私协议》，请先阅读并确认同意。
- **不提供验证码自动完成功能**：不读取或填写短信验证码，不自动完成图形、滑块或人机验证，不自动提交登录。

## 使用

1. 安装 Tampermonkey，再[安装脚本](https://raw.githubusercontent.com/Anduin9527/recruitment-mobile-helper/main/recruitment-mobile-helper.user.js)。未弹出安装页时，将脚本全部内容粘贴到油猴的新建脚本中保存。
2. 在油猴菜单中“设置 / 修改预设手机号”，刷新招聘页面，点击 **ϟ**。

为识别 Moka 企业自定义域名，脚本匹配 HTTPS 页面，但仅在识别到支持的登录界面时显示按钮。不同版本的 Moka 页面可能需要补充适配。

手机号保存在油猴本地存储，填写和请求短信时交给当前招聘网站；脚本不另行收集或上传。页面加载不会自动填写或请求短信。

[MIT License](LICENSE) · 结构与安装说明参考 [ja-ka/violentmonkey](https://github.com/ja-ka/violentmonkey) 和 [n1ckDotEXE/violentmonkey-scripts](https://github.com/n1ckDotEXE/violentmonkey-scripts)。
