# Yarn with PnP 升级指北
[Yarn](https://link.zhihu.com/?target=http%3A//yarnpkg.com/)  作为 JavaScript生态的一个强大的依赖管理工具，在去年年初就正式发布了V2版本，但就当时的表现情况来看稳定性属实不高。时间一晃已经到了2021年，随着去年`webpack5`，` vite`，`snowpack`等构建工具的升级与创新，前端的效能模块也有了比较大的进步空间，因此笔者准备对构建工具与Yarn with PnP协同进行前端工程化的整体链路提效，于是就记录下此文。

## 现状与痛点

Yarn 团队开发 PnP 特性最直接的原因就是现有的依赖管理方式效率太低。引用依赖时慢，安装依赖时也慢。

而且我们在执行 `yarn install` 操作会执行以下四个步骤

1. 将依赖包的版本区间解析为某个具体的版本号
2. 下载对应版本依赖的 tar 包到本地离线镜像
3. 将依赖从离线镜像解压到本地缓存
4. 将依赖从缓存拷贝到当前目录的 `node_modules` 目录

其中第 4 步同样涉及大量的文件 I/O，导致安装依赖时效率不高（尤其是在 CI 环境，每次都需要安装全部依赖）。

`Plug’n’Play` ，作为重头戏，由此而生! 它是能彻底解决问题同时还可以与现有生态兼容的解决方案。



## 新特性

### 可读性更好的输出日志

虽然相对于其他替代方案（例如npm）Yarn的输出日志的可读性算是比较高的了，可是它还是存在各种各样的问题，例如当输出信息特别多的时候，开发者很难在一大堆输出中找到有用的内容，而且输出日志的颜色并没有起到帮助用户快速识别出重要信息的作用，甚至还会对日志的阅读造成一定的干扰。基于这些原因，v2版本对输出日志进行了一些改进，我们先来看一下它大概变成了什么样子了：

### PnP

PnP 的具体工作原理是，作为把依赖从缓存拷贝到 `node_modules` 的替代方案，Yarn 会维护一张静态映射表，该表中包含了以下信息：

- 当前依赖树中包含了哪些依赖包的哪些版本
- 这些依赖包是如何互相关联的
- 这些依赖包在文件系统中的具体位置

这个映射表在 Yarn 的 PnP 实现中对应项目目录中的 `.pnp.js` 文件。

这个 `.pnp.js` 文件是如何生成，Yarn 又是如何利用它的呢？

在安装依赖时，在第 3 步完成之后，Yarn 并不会拷贝依赖到 `node_modules` 目录，而是会在 `.pnp.js` 中记录下该依赖在缓存中的具体位置。这样就避免了大量的 I/O 操作同时项目目录也不会有 `node_modules` 目录生成。

同时 `.pnp.js` 还包含了一个特殊的 resolver，Yarn 会利用这个特殊的 resolver 来处理 `require()` 请求，该 resolver 会根据 `.pnp.js` 文件中包含的静态映射表直接确定依赖在文件系统中的具体位置，从而避免了现有实现在处理依赖引用时的 I/O 操作。

#### 带来的好处

从 PnP 的实现方案可以看出，同一个系统上不同项目引用的相同依赖的相同版本实际都是指向的缓存中的同一个目录。这带来了几个最直观的好处：

- 安装依赖的速度得到了空前的提升 (第一次安装没啥感觉，之后安装的速度极快)
- CI 环境中多个 CI 实例可以共享同一份缓存
- 同一个系统中的多个项目不再需要占用多份磁盘空间 (如 monorepo 中`lerna` 模式)

## 交互模式（interactive mode）

假如你要在项目的某个workspace中引入某个依赖，你可能要考虑其他workspaces是否也用到了这个依赖，而且要避免引入不兼容的版本。v2版本中，你可以使用`-i`参数来让`yarn add`命令进入到交互模式，这样yarn就会帮你检查这个依赖有没有在其他workspaces中被使用，并且会让你选择是要复用其他workspaces中的依赖版本还是使用另外的版本。

并且支持自动发布关联的workspace，之前在monorepo开发模式下当某个包发布了新的版本之后，发布其它相关联的包十分麻烦。为了解决这个问题，Yarn v2版本采取了和Lerna以及其他类似工具完全不同的解决方案，它把这部分逻辑放在了一个单独的叫做 [version的插件 ](https://link.zhihu.com/?target=https%3A//next.yarnpkg.com/features/release-workflow)中。version插件允许你将一部分包版本管理工作分发给你的代码贡献者，而且它还提供了一个友好的交互界面来让你十分容易地管理关联包的发布。

## 零安装（Zero-Installs）

[依赖零安装](https://link.zhihu.com/?target=https%3A//next.yarnpkg.com/features/zero-installs)更像是一个理念而不是一个功能，在我们安装完依赖后，依赖文件都缓存在项目文件夹中（.yarn/cache），只需确保将其上传到git即可完成零安装，同时保证依赖版本一致性。

在我们运行`yarn install`后，Yarn将生成一个`.pnp.js`文件。也将其添加到您的存储库，它包含Node将用于加载程序包的依赖关系树。

看到这里你一定很惊讶，居然把整个`node_modules`上传到git上，这个做法太疯狂。如果真的直接把node_modules提交到远端仓库的话，每次提交都是一个噩梦，因为node_modules的小文件很多，而且容量大。不仅每次提交下载而且合并冲突也是噩梦。

为了解决这个问题，v2版本默认开启了Plug'n'Play + zip loading的功能，这个功能开启后你的项目将不再存在node_modules文件夹，所有的依赖都会被压缩，并且体积很小，原本需要`1.2`GB的依赖，下载只需要`150`MB。并且数量不会很多，一般都以`包名+版本号+hash`命名。使用依赖零安装有哪些好处呢？

- dev
  - 代码review的时候可以非常清楚的看见哪些依赖发生了变化
- 更快，更简单，更稳定的CI部署
  - 每次部署代码时，依赖的install占用的时间一直是一个大头，去掉这个步骤，整个流水线速度会大大提升
  - 不会存在本地环境运行正常，而线上环境运行挂掉的问题
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
// yarn > 1.22
yarn set version berry

// yarn < 1.22
yarn policies set-version berry 
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

如果你使用的库需要从私有源拉取，请先查看并更改yarn配置。更改 yarn 源，由于和Yarn 1.x的配置差异挺大，全部的配置可查阅[官方配置文档](https://yarnpkg.com/configuration/yarnrc)，本文对私有源配置做一个示例：

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

### node_modules相关

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

### 调试依赖

同上文，在PnP模式下由于依赖都指向了全局缓存，我们不再可以直接修改这些依赖。针对这种场景，Yarn 提供了 `yarn unplug [packageName]` 来将某个指定依赖拷贝到项目中的 `.yarn/unplugged` 目录下。其实是在 `package.json` 中写入了以下配置：

```
"dependenciesMeta": {
    "node-sass": {
      "built": false
    },
    "webpack@4.46.0": {
      "unplugged": true
    },
    "webpack-dev-server@3.11.2": {
      "unplugged": true
    }
  },
```

之后 `.pnp.js` 中的 resolver 就会自动加载这个 unplug 的版本。

调试完毕后，再执行 `yarn unplug --clear packageName` 可移除本地 `.pnp/unplugged` 中的对应依赖。

### Webpack4 相关

Webpack5 本身已经支持PnP，但是如果使用的Webpack4就需要安装[`pnp-webpack-plugin` ](https://github.com/arcanis/pnp-webpack-plugin)插件

### IDE支持

如果使用的是VsCode，要点是

1. 安装[ZipFS](https://marketplace.visualstudio.com/items?itemName=arcanis.vscode-zipfs) VSCode扩展
2. 确保`typescript`，`eslint`，`prettier`等使用的IDE扩展所有相关性在`top level`项目（而不是随机的工作空间）
3. Run `yarn dlx @yarnpkg/pnpify --sdk vscode`
4. 对这些变更就行git commit，其他人就不必遵循相同的过程
5. 对于TypeScript，不要忘记在VSCode中选择 [Use Workspace Version](https://code.visualstudio.com/docs/typescript/typescript-compiling#_using-the-workspace-version-of-typescript)。

更多关于IDE的支持说明 [yarn官网](https://yarnpkg.com/getting-started/editor-sdks) 有详细对IDE支持的说明