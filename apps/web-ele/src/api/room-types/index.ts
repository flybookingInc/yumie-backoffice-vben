import type {
  RoomType,
  RoomTypeCreateInput,
  RoomTypeUpdateInput,
} from './types';

import { requestClient } from '#/api/request';

export interface RoomTypeListParams {
  hotelId?: string;
}

export const roomTypesApi = {
  /** POST /v2/room-types — 新增房型 */
  create(data: RoomTypeCreateInput) {
    return requestClient.post<RoomType>('/room-types', data);
  },
  /** DELETE /v2/room-types/:id — 刪除房型 + cascade inventory */
  delete(id: string) {
    return requestClient.delete<{ deleted: string }>(`/room-types/${id}`);
  },
  /** GET /v2/room-types/:id — 取單一房型 */
  get(id: string, params: RoomTypeListParams = {}) {
    return requestClient.get<RoomType>(`/room-types/${id}`, { params });
  },
  /** GET /v2/room-types — 列出該飯店所有房型 */
  list(params: RoomTypeListParams = {}) {
    return requestClient.get<RoomType[]>('/room-types', { params });
  },
  /** PUT /v2/room-types/:id — 更新房型 */
  update(id: string, data: RoomTypeUpdateInput) {
    return requestClient.put<RoomType>(`/room-types/${id}`, data);
  },
};

export type { RoomType, RoomTypeCreateInput, RoomTypeUpdateInput };
