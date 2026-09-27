export interface IProfessionalRepository {
  createProfessional(professional: any): any;
  getProfessionalById(id: string): any;
  getProfessionals(): any[];
  updateProfessionalStatus(id: string, status: string): any;
}
