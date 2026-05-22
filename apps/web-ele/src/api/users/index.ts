import type {
  HotelUser,
  HotelUserCreateInput,
  HotelUserRule,
  HotelUserUpdateInput,
} from './types';

import { requestClient } from '#/api/request';

export const usersApi = {
  /** POST /v2/users — superAdmin */
  create(data: HotelUserCreateInput) {
    return requestClient.post<HotelUser>('/users', data);
  },
  /** DELETE /v2/users/:id — superAdmin */
  delete(id: string) {
    return requestClient.delete<{ deleted: string }>(`/users/${id}`);
  },
  /** GET /v2/users — superAdmin */
  list() {
    return requestClient.get<HotelUser[]>('/users');
  },
  /** PUT /v2/users/:id — superAdmin */
  update(id: string, data: HotelUserUpdateInput) {
    return requestClient.put<HotelUser>(`/users/${id}`, data);
  },
};

export type {
  HotelUser,
  HotelUserCreateInput,
  HotelUserRule,
  HotelUserUpdateInput,
};
