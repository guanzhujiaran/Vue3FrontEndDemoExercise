export const navigationData = {
  items: [
    {
      title: "主页",
      path: "/",
    },
    {
      title: "用户中心",
      path: "/app/user-center",
      children: [
        {
          title: "全局设置",
          path: "/app/user-center/account-global-config",
        },
        {
          title: "基本信息",
          path: "/app/user-center/account-base-info-config",
        },
      ],
    },
    {
      title: "抽奖数据",
      path: "/app/lot-data",
      children: [
        {
          title: "爬虫状态",
          path: "/app/lot-data/scrapy-stat",
        },
        {
          title: "B站数据",
          path: "/app/lot-data/bili-data",
          children: [
            {
              title: "官方抽奖",
              path: "/app/lot-data/bili-data/official",
            },
            {
              title: "预约抽奖",
              path: "/app/lot-data/bili-data/reserve",
            },
            {
              title: "充电抽奖",
              path: "/app/lot-data/bili-data/charge",
            },
          ],
        },
        {
          title: "中奖统计",
          path: "/app/lot-data/bili-atari-ranking",
        },
      ],
    },
    {
      title: "山姆数据",
      path: "/samsclub/info",
    },
    {
      title: "反馈区",
      path: "/app/Feedback",
    },
  ],
};

export type NavigationItem = {
  title: string;
  path: string;
  children?: NavigationItem[];
};

export type NavigationData = {
  items: NavigationItem[];
};