TPM - Static Package Manager
=================================================

TPM是前端打包工具。

## 安装

1. 源代码安装
	```
	git clone git://github.com/tudouui/tpm.git
	```

2. NPM安装
	```
	npm install tpm -g
	```

## 使用方法

```bash
tpm [COMMAND] [PATH]
```

### 构建JS

```bash
tpm build src/js/g.js
tpm build src/js/page/demo.js
tpm build src/js
```

### 构建LESS

```bash
tpm build src/css/g.less
tpm build src/css/page/demo.less
tpm build src/css
```

### 构建图片、embed

```bash
tpm build src/img/demo.png
tpm build src/embed/storage.html
tpm build src/img
```

### 整理build、dist目录

删除build、dist里的多余的目录和文件夹。

```bash
tpm clear
```

### config.json配置

* main：JS和CSS入口文件。
* libjs：全局非AMD文件。
* globaljs：全局入口文件。
* ignore：要忽略的模块列表，构建非全局JS文件时使用。
