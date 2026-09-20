export type CollectionListItem = {
  id: string;
  name: string;
  description: string | null;
  ownerSubject: string;
  isShared: boolean;
  itemCount: number;
  createdAt: string;
};

export type CollectionItemDetails = {
  documentId: string;
  addedBy: string;
  addedAt: string;
};

export type CollectionDetails = {
  id: string;
  name: string;
  description: string | null;
  ownerSubject: string;
  isShared: boolean;
  createdAt: string;
  items: CollectionItemDetails[];
};
