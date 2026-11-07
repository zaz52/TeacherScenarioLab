# Magic UI 交互动效

更新：2026-11-07，Asia/Shanghai。

## 组件来源与集成

按用户指定的magic-ui技能，从官方shadcn兼容registry获取组件源码：

- [Blur Fade](https://magicui.design/docs/components/blur-fade)，源码https://magicui.design/r/blur-fade.json。
- [Ripple Button](https://magicui.design/docs/components/ripple-button)，源码https://magicui.design/r/ripple-button.json。

项目已初始化shadcn且已有motion依赖，本次按手动安装方式写入components/ui，登记@magicui registry。保留组件API，针对现有按钮DOM及移动样式、键盘点击位置、波纹数量上限、装饰层语义及减少动态效果做适配。未新增或升级依赖。

## 覆盖范围

- 按钮：全站按压及桌面悬停反馈；首页进入实训、处置记录按钮使用Ripple Button。
- 页面：路由进入淡入；main新挂载淡入。效果完成后释放动画，不保留布局transform。
- 面板：记录/事件/大厅进入过渡，设置使用MotionSurface响应分类切换，不以key重建表单。
- 弹窗与卡片：保留Radix焦点和关闭语义，增加短入场与悬停过渡。
- 首页应急目标：Blur Fade轻量淡入；无脚本时文本保持可见。

统一系统prefers-reduced-motion设置，禁用CSS持续动画和波纹，MotionConfig采用user策略。业务事件处理沿用，动画层不截获点击，无模型调用、数据库修改或权限变化。实际手机/桌面视觉与交互由用户验收，构建和部署健康结果见交付报告。

## Magic UI 许可证

以下为官方仓库LICENSE.md原文：

```text
MIT License

Copyright (c) Magic UI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

```
