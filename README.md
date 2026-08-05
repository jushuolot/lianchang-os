# 链场 OS

物流供应链**现场操作系统**。每个业务流程是一场可插拔的「场景」；现场导引（地图 + 实景 + 本步要求）默认开启，完整工位供熟手使用。用语为**工作语言**。

## 产品原则

- **流程即场景**：核心引擎 + 工位壳，持续加戏
- **现场导引（默认）**：按操作者角色逐步指引——园区/仓内示意地图 + 节点实景图 + 本步要求 + 单一主操作
- **统一登录**：走 V2Way 账号中心一键进入（与硕泰 / 企账同套 SSO）
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

与 www / chain / kudi 同机：**ECS `101.200.128.82` + Caddy**。

```bash
./deploy/deploy-aliyun.sh
```

会：根路径构建 → rsync 到 `/opt/jinshouzhi/lianchang-os` → 更新 Caddyfile → reload。

DNS：`os.v2way.com` A 记录 → `101.200.128.82`（已解析则 Caddy 自动签证书）。

生产地址：https://os.v2way.com/

（可选）OSS/CDN 脚本仍保留在 `deploy/oss-upload.sh`，当前主路径为 ECS。

## 技术

- React + TypeScript + Vite
- 场景插件：`src/scenes/`
- 状态本地 `localStorage`（演示）
- 实景图 `public/pov/`，导引 `src/guide.ts` + 各场景 `resolveGuide`
