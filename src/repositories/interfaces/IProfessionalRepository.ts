export interface IProfessionalRepository {
  createProfessional(professional: any): any;
  getProfessionalById(id: string): any;
  getProfessionalByUserId?(userId: string): any;
  getProfessionals(): any[];
  updateProfessionalStatus(id: string, status: string): any;
}
