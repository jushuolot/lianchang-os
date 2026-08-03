/** 终端现场取证：手机拍照 / 相册 */

export type FieldShotKind =
  | 'plate'
  | 'gate_check'
  | 'dock_cargo'
  | 'sign_cargo'
  | 'depart'
  | 'pick_confirm'
  | 'check_confirm'
  | 'dock_stage'

export interface FieldShot {
  id: string
  station: 'driver' | 'gate' | 'counter'
  kind: FieldShotKind
  label: string
  dataUrl: string
  at: string
}

export const FIELD_SHOT_OPTIONS: Record<
  'driver' | 'gate' | 'counter',
  { kind: FieldShotKind; label: string; hint: string }[]
> = {
  driver: [
    { kind: 'plate', label: '到闸车牌照', hint: '拍车牌与闸口相对位置' },
    { kind: 'dock_cargo', label: '月台备货照', hint: '拍指定道口备货状态' },
    { kind: 'pick_confirm', label: '拣货完成照', hint: '拍拣货容器与库位' },
    { kind: 'dock_stage', label: '送达月台照', hint: '拍月台落位状态' },
  ],
  gate: [
    { kind: 'plate', label: '车牌核验照', hint: '拍清晰车牌' },
    { kind: 'gate_check', label: '入场核验照', hint: '拍车辆停靠待检区' },
    { kind: 'depart', label: '离场核验照', hint: '拍驶离前车辆状态' },
    { kind: 'check_confirm', label: '复核归档照', hint: '拍复核台货物' },
  ],
  counter: [
    { kind: 'sign_cargo', label: '点件签收照', hint: '拍待签收货物全貌' },
    { kind: 'dock_stage', label: '月台交接照', hint: '拍月台交接现场' },
  ],
}
