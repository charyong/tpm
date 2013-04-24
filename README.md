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
tpm [command]
```

### 构建JS

```bash
tpm src/js/g.js
tpm src/js/page/demo.js
tpm src/js
```

### 构建LESS

```bash
tpm src/css/g.less
tpm src/css/page/demo.less
tpm src/css
```

### 构建图片、embed

```bash
tpm src/img/demo.png
tpm src/embed/storage.html
tpm src/img
```

### 指定配置
用config参数指定配置，默认用当前目录下的`tpm-config.js`。

```bash
tpm src/js/g.js --config=my-config.js
```

### 整理build、dist目录

删除build、dist里的多余的目录和文件。

```bash
tpm cleanup
```

### 配置说明

* main：JS和CSS入口文件。
* libjs：全局非AMD文件。
* globaljs：全局入口文件。
* ignore：要忽略的模块列表，构建非全局JS文件时使用。
