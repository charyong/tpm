TPM - Static Package Manager
=================================================

TPM是前端打包工具。

## 安装

```
npm install tpm -g
```

## 使用方法

```bash
ytpm [COMMAND]
```

### 目录结构

```
src/		# 源代码
	js/
	css/
	img/
build/		# 打包后代码，未压缩
	js/
	css/
dist/		# 压缩后代码
	js/
	css/
	img/
```

### 构建JS

```bash
ytpm src/js/g.js
ytpm src/js/page/demo.js
ytpm src/js
```

### 构建LESS

```bash
ytpm src/css/g.less
ytpm src/css/page/demo.less
ytpm src/css
```

### 构建图片

```bash
ytpm src/img/demo.png
ytpm src/img
```

### 压缩打包后的代码

```bash
ytpm min build/js/g.js
```

### 指定配置
用config参数指定配置，默认用当前目录下的`tpm-config.js`。

```bash
ytpm src/js/g.js --config=my-config.js
```

### 整理build、dist目录

删除build、dist里的多余的目录和文件。

```bash
ytpm cleanup
```

### 配置说明

* main：JS和CSS入口文件。
* libjs：全局非AMD文件。
* globaljs：全局入口文件。
