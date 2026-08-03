# 链场 OS

物流供应链**现场操作系统**。每个业务流程是一场可插拔的「场景」；现场导引（地图 + 实景 + 本步要求）默认开启，完整工位供熟手使用。用语为**工作语言**。

## 产品原则

- **流程即场景**：核心引擎 + 工位壳，持续加戏
- **现场导引（默认）**：按操作者角色逐步指引——园区/仓内示意地图 + 节点实景图 + 本步要求 + 单一主操作
- **真实干活**：工单号、口令/库位、核验项、作业记录、终端拍照
- **人对岗**：切换角色 / 工位办理本票

## 当前场景

| 模块 | 状态 |
|------|------|
| 仓配自提 · 进出场 | 已启用 |
| 仓内拣货 · 出库到月台 | 已启用 |
| 干线提送 · 双端准入 | 待加 |
| 在途异常 · 现场处置 | 待加 |

拣货出库闭环：`下发波次 → 开始拣货 → 拣货完成 → 复核 → 送达月台 → 交接确认`

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
# 阿里云自定义域 os.v2way.com（根路径）
VITE_BASE=/ npm run build

# GitHub Pages 子路径
VITE_BASE=/lianchang-os/ npm run build
```

## 发布到阿里云（os.v2way.com）

推荐：**OSS 静态网站 + CDN**，绑定域名 `os.v2way.com`。

1. 创建 OSS Bucket（公网读或 CDN 回源），开启静态网站，默认首页 `index.html`
2. CDN 加速域名绑定 Bucket，添加 CNAME：`os.v2way.com` → CDN 分配域名
3. HTTPS 证书（阿里云免费 DV 即可）
4. 构建上传：

```bash
chmod +x deploy/oss-upload.sh
OSS_BUCKET=你的bucket OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com ./deploy/oss-upload.sh
```

或容器（ECS / ACK / SAE）：

```bash
docker build -f deploy/Dockerfile -t lianchang-os:latest .
docker run -p 80:80 lianchang-os:latest
```

GitHub Actions：仓库 Secrets 配好后，手动跑 workflow「Deploy Aliyun OSS」。

> 本机未检测到阿里云 AccessKey，需你在控制台完成 Bucket/CDN/DNS 后执行上传，或把密钥配进 Secrets。

演示站（GitHub Pages）：https://jushuolot.github.io/lianchang-os/

## 技术

- React + TypeScript + Vite
- 场景插件：`src/scenes/`
- 状态本地 `localStorage`（演示）
- 实景图 `public/pov/`，导引 `src/guide.ts` + 各场景 `resolveGuide`
