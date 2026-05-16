import { SportDTO, CreateSportRequest } from "../../../shared/index.js";

export interface SportRepository {
    create(data: CreateSportRequest): Promise<SportDTO>;
    findByName(name: string): Promise<SportDTO | null>;
}