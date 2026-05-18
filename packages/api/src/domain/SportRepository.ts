import { SportDTO, CreateSportRequest, UpdateSportRequest } from "../../../shared/index.js";

export interface SportRepository {
    create(data: CreateSportRequest): Promise<SportDTO>;
    findById(id: string): Promise<SportDTO | null>;
    findByName(name: string): Promise<SportDTO | null>;
    findAll(): Promise<SportDTO[]>;
    update(id: string, data: UpdateSportRequest): Promise<SportDTO>;
    delete(id: string): Promise<void>;

}