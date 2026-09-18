/* 地点数据 —— SVG 地图节点与场景 */
window.LP = window.LP || {};
LP.data = LP.data || {};

LP.data.locations = {
  location_archive: {
    id: 'location_archive', name: '数字档案馆', year: '2026',
    x: 78, y: 22, modern: true,
    desc: '你所在的地方。旧的一切正在被一页一页扫描进新的时代。',
    unlock: 'start', scene: null
  },

  location_clocktower: {
    id: 'location_clocktower', name: '旧钟楼', year: '未知',
    x: 30, y: 38,
    desc: '城里的老钟楼。钟已经很多年不走了。',
    unlock: 'act1_done', scene: 'clocktower',
    objects: [
      { id: 'obj_bell',    name: '旧钟',   pos: 'top' },
      { id: 'obj_wall',    name: '墙壁',   pos: 'left' },
      { id: 'obj_board',   name: '公告栏', pos: 'right' },
      { id: 'obj_bench',   name: '长椅',   pos: 'bottom-left' },
      { id: 'obj_door',    name: '旧木门', pos: 'bottom' }
    ]
  },

  location_oldstreet: {
    id: 'location_oldstreet', name: '老街', year: '未知',
    x: 48, y: 66,
    desc: '青石板的老街。雨天的时候，整条街都在反光。',
    unlock: 'act3', scene: 'oldstreet',
    objects: [
      { id: 'obj_shop',  name: '旧面摊', pos: 'left' },
      { id: 'obj_stone', name: '青石板', pos: 'bottom' }
    ]
  },

  location_ferry: {
    id: 'location_ferry', name: '渡口', year: '未知',
    x: 68, y: 82,
    desc: '城郊的渡口。离开的人从这里上船。',
    unlock: 'act4', scene: 'ferry',
    objects: [
      { id: 'obj_river', name: '河水',   pos: 'bottom' },
      { id: 'obj_post',  name: '系缆桩', pos: 'left' }
    ]
  }
};
