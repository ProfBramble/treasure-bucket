[Yarn  ](https://link.zhihu.com/?target=http%3A//yarnpkg.com/)作为 JavaScript生态的一个强大的依赖管理工具，在去年年初就正式发布了V2版本，但就当时的表现情况来看稳定性属实不高。时间一晃已经到了2021年，随着去年`webpack5`，` vite`，`snowpack`等构建工具的升级与创新，前端的效能模块也有了比较大的进步空间，因此笔者准备对构建工具与Yarn with PnP协同进行前端工程化的整体链路提效，于是就记录下此文。

## 现状与痛点

Yarn 团队开发 PnP 特性最直接的原因就是现有的依赖管理方式效率太低。引用依赖时慢，安装依赖时也慢。

而且我们在执行 `yarn install` 操作会执行以下四个步骤

1. 将依赖包的版本区间解析为某个具体的版本号
2. 下载对应版本依赖的 tar 包到本地离线镜像
3. 将依赖从离线镜像解压到本地缓存
4. 将依赖从缓存拷贝到当前目录的 `node_modules` 目录

其中第 4 步同样涉及大量的文件 I/O，导致安装依赖时效率不高（尤其是在 CI 环境，每次都需要安装全部依赖）。

`Plug’n’Play` ，作为重头戏，由此而生! 它是能彻底解决问题同时还可以与现有生态兼容的解决方案。

## 准备工作

首先升级到yarn2+版本，此版本自带PnP。

```
npm install -g yarn@berry
```

开始前我们查看下当前的yarn版本号

```
yarn -v // 2.4.0
```

## step1

由于yarn2和yarn1基本不兼容，所以为了避免yarn1的冲突，先清理掉项目的`node_modules`，`yarn.lock`，然后执行

```
yarn set version berry
```

执行后项目就被明确声明为yarn2项目。出现了`.yarnrc.yml`文件与`.yarn`目录。

## step2

之后的安装步骤和 `yarn@1.x` 没啥区别，直接 `yarn` 安装依赖即可

```
yarn
```

笔者在安装过程中出现了报错，最后发现是项目文件夹顶层的`User`文件夹仍然存在一份 `yarn.lock` 所致，把其清除后重新安装依赖

## step3

安装完毕后，我们可以看见`node_modules`依然不复存在，代替它的是.yarn目录，里面有cache、unplugged、

以及外面一个.pnp.js我们的依赖在.yarn文件夹的cache目录中

【图】



## Tips

### 私有库设置

如果你使用的库需要从私有源拉取，请先查看并更改yarn配置.更改 yarn 源，可以选择用命令行更改

```
yarn config set npmRegistryServer http://registry.npm.dtstack.com  
```

同时命令行修改的配置文件就是当前工作区的`.yarnrc.yml`文件，因此也可以直接修改此文件。

由于源不是HTTPS，因此还需要设置进入白名单,我原本直接把URI设置入白名单，发现并没有什么用，查看了yarn源码后发现取的是`URL.hostname`，因此我们应该如下设置，配置项也支持模糊匹配。

```
yarn config set unsafeHttpWhitelist registry.npm.dtstack.com   
```

完成上述配置后，文件应该含有以下内容：

```
// .yarnrc.yml

npmRegistryServer: "http://registry.npm.dtstack.com"

unsafeHttpWhitelist: registry.npm.dtstack.com

yarnPath: .yarn/releases/yarn-berry.cjs
```

### 依赖安装失败

yarn2的输出日志可读性还是比较高的，可以从[状态码说明](https://yarnpkg.com/advanced/error-codes#yn0009---build_failed)找到解决问题的思路。

笔者遇到的错误代码是*YN0009 - `BUILD_FAILED`* ，日志输出的内容为项目workspace构建失败，经过查找发现是项目 `package.json` 中的script含有含有`/.*npm.*/`相关内容所致。

## node_modules相关

现在项目不再有node_modules文件夹，也没有对应的.bin文件，之前依赖这些的文件只需要修改为 `yarn run` 即可正常运行。

例如：

```
node --max_old_space_size=4092 ./node_modules/.bin/webpack-dev-server --inline --config build/dev.js --open
```

修改为

```
yarn run webpack-dev-server --max_old_space_size=4092  --inline --config build/dev.js --open
```

如果项目用有直接调用 `node` 的内容也需要更改为使用 `yarn node` 启动

