import { db } from '../db/index.js';
import { 
  ProjectRFQ, 
  RFQInvitation, 
  EPCBid, 
  EPCBidRevision, 
  RFQStatus,
  EPCBidStatus
} from '../types/rfq.js';

export const rfqRepository = {
  // RFQs
  findRFQsByProjectId(projectId: string): ProjectRFQ[] {
    return db.getProjectRFQsByProjectId(projectId);
  },

  findRFQById(id: string): ProjectRFQ | undefined {
    return db.getProjectRFQById(id);
  },

  getAllRFQs(): ProjectRFQ[] {
    return db.getProjectRFQs();
  },

  createRFQ(data: Omit<ProjectRFQ, 'id' | 'createdAt'>): ProjectRFQ {
    return db.createProjectRFQ(data);
  },

  updateRFQ(id: string, updates: Partial<ProjectRFQ>): ProjectRFQ | null {
    return db.updateProjectRFQ(id, updates);
  },

  // Invitations
  getInvitations(rfqId: string): RFQInvitation[] {
    return db.getRFQInvitations(rfqId);
  },

  getInvitationsForEpc(epcOrgId: string): RFQInvitation[] {
    return db.getRFQInvitationsByEpcOrg(epcOrgId);
  },

  createInvitation(inv: Omit<RFQInvitation, 'id' | 'invitedAt'>): RFQInvitation {
    return db.createRFQInvitation(inv);
  },

  updateInvitation(id: string, updates: Partial<RFQInvitation>): RFQInvitation | null {
    return db.updateRFQInvitation(id, updates);
  },

  // Bids
  getBidsByRfqId(rfqId: string): EPCBid[] {
    return db.getEPCBidsByRfqId(rfqId);
  },

  getBidsByProjectId(projectId: string): EPCBid[] {
    return db.getEPCBidsByProjectId(projectId);
  },

  getBidsByEpcOrgId(epcOrgId: string): EPCBid[] {
    return db.getEPCBidsByEpcOrgId(epcOrgId);
  },

  getBidById(id: string): EPCBid | undefined {
    return db.getEPCBidById(id);
  },

  getAllBids(): EPCBid[] {
    return db.getEPCBids();
  },
  createBid(data: Omit<EPCBid, 'id' | 'createdAt' | 'currentRevisionNumber'>): EPCBid {
    return db.createEPCBid(data);
  },

  updateBid(id: string, updates: Partial<EPCBid>): EPCBid | null {
    return db.updateEPCBid(id, updates);
  },

  // Bid Revisions (Snapshot)
  getRevisions(bidId: string): EPCBidRevision[] {
    return db.getEPCBidRevisions(bidId);
  },

  createRevision(data: Omit<EPCBidRevision, 'id' | 'createdAt'>): EPCBidRevision {
    return db.createEPCBidRevision(data);
  }
};
