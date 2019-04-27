// Metadata related
interface IMetaDataExternalLink {
  externalLink_description: string;
  externalLink_value: string;
}

interface IMetaDataAddress {
  address_building: string;
  address_number: string;
  address_street: string;
  address_postcode: string;
  address_city: string;
  address_country: string;
}

export interface IMetaDataPerson {
  _id: string;
  person_surname: string;
  person_prename: string;
  person_email: string;
  person_role: string[];
  person_phonenumber: string;
  person_note: string;
  person_institution: string | any[];
  person_institution_data: IMetaDataInstitution[];
  roles: {
    [key: string]: string[];
  };

  display?: string;
  value?: string;
}

export interface IMetaDataInstitution {
  _id: string;
  institution_name: string;
  institution_address: IMetaDataAddress;
  institution_university: string;
  institution_role: string[];
  institution_note: string;
  roles: {
    [key: string]: string[];
  };

  display?: string;
  value?: string;
}

export interface IMetaDataTag {
  _id: string;
  display: string;
  value: string;
}

export interface IMetaDataPhysicalObject {
  _id: string;
  phyobj_title: string;
  phyobj_description: string;
  phyobj_externalIdentifier: any[];
  phyobj_externalLink: IMetaDataExternalLink[];
  phyobj_externalFile: any;
  phyobj_place: IMetaDataAddress[];
  phyobj_person_existing_role: any[];
  phyobj_institution_existing_role: any[];
  phyobj_metadata_files: IFile[];
  phyobj_collection: string;

  phyobj_rightsownerSelector: number;
  phyobj_rightsowner: Array<IMetaDataPerson | IMetaDataInstitution>;
  phyobj_rightsowner_person: Array<IMetaDataPerson | null>;
  phyobj_rightsowner_institution: Array<IMetaDataInstitution | null>;
  phyobj_person_existing: Array<IMetaDataPerson | null>;
  phyobj_person: Array<IMetaDataPerson | null>;
  phyobj_institution: Array<IMetaDataInstitution | null>;
  phyobj_institution_existing: Array<IMetaDataInstitution | null>;
}

export interface IMetaDataDigitalObject {
  _id: string;
  digobj_type: string;
  digobj_title: string;
  digobj_description: string;
  digobj_licence: string;
  digobj_discipline: string[];
  digobj_tags: IMetaDataTag[];
  digobj_objecttype: string;
  digobj_externalIdentifier: any[];
  digobj_dimensions: any[];
  digobj_creation: any[];
  digobj_externalLink: IMetaDataExternalLink[];
  digobj_metadata_files: any[];
  digobj_files: Array<IFile | null>;
  digobj_statement: string;
  phyObjs: Array<IMetaDataPhysicalObject | null>;

  digobj_rightsownerSelector: number;
  digobj_rightsowner: Array<IMetaDataPerson | IMetaDataInstitution | null>;
  digobj_rightsowner_person: Array<IMetaDataPerson | null>;
  digobj_rightsowner_institution: Array<IMetaDataInstitution | null>;
  contact_person_existing: Array<IMetaDataPerson | null>;
  contact_person: Array<IMetaDataPerson | null>;
  digobj_person_existing: Array<IMetaDataPerson | null>;
  digobj_person: Array<IMetaDataPerson | null>;
  digobj_person_existing_role: any[];
}

// User related
export interface IUserData {
  fullname: string;
  username: string;
  _id: string;
}

export interface ILoginData {
  username: string;
  password: string;
}

export interface ILDAPData {
  _id: string;
  username: string;
  sessionID: string;
  fullname: string;
  prename: string;
  surname: string;
  rank: string;
  mail: string;
  role: string;

  data: {
    [key: string]: Array<string | null | IModel | IAnnotation | ICompilation>;
  };
}

// Annotation related
export interface IAnnotation {
  _id: string;
  validated: boolean;

  identifier: string;
  ranking: number;
  creator: IAgent;
  created: string;
  generator: IAgent;
  generated?: string;
  motivation: string;
  lastModificationDate?: string;
  lastModifiedBy: IAgent;

  body: IBody;
  target: ITarget;
}

export interface IAgent {
  type: string;
  name: string;
  _id: string;
  homepage?: string;
}

export interface IBody {
  type: string;
  content: IContent;
}

export interface IContent {
  type: string;
  title: string;
  description: string;
  link?: string;
  relatedPerspective: ICameraPerspective;
  [key: string]: any;
}

export interface ICameraPerspective {
  cameraType: string;
  position: IVector;
  target: IVector;
  preview: string;
}

export interface IVector {
  x: number;
  y: number;
  z: number;
}

export interface ITarget {
  source: ISource;
  selector: ISelector;
}

export interface ISource {
  link?: string;
  relatedModel: string;
  relatedCompilation?: string;
}

export interface ISelector {
  referencePoint: IVector;
  referenceNormal: IVector;
}

// Object related
export interface IFile {
  file_name: string;
  file_link: string;
  file_size: number;
  file_format: string;
}

export interface IModel {
  _id?: string;
  annotationList: Array<IAnnotation | null>;
  name: string;
  files: IFile[] | null;
  finished: boolean;
  ranking?: number;
  relatedDigitalObject?: any;
  online: boolean;
  isExternal?: boolean;
  externalService?: string;
  mediaType: string;
  dataSource: {
    isExternal: boolean;
    service?: string;
  };
  settings?: {
    preview?: string;
    cameraPositionInitial?: any;
    background?: any;
    lights?: any;
    rotation?: any;
    scale?: any;
  };
  processed?: {
    time?: {
      start: string;
      end: string;
      total: string;
    };
    low?: string;
    medium?: string;
    high?: string;
    raw?: string;
  };
}

export interface ICompilation {
  _id?: string;
  name?: string;
  description?: string;
  relatedOwner?: string;
  passcode?: string;
  models: Array<IModel | null>;
  annotationList: Array<IAnnotation | null>;
}

// Socket related
export interface ISocketAnnotation {
  annotation: any;
  user: ISocketUser;
}

export interface ISocketMessage {
  message: string;
  user: ISocketUser;
}

export interface ISocketUser {
  _id: string;
  socketId: string;
  username: string;
  fullname: string;
  room: string;
}

export interface ISocketUserInfo {
  user: ISocketUser;
  annotations: any[];
}

export interface ISocketChangeRoom {
  newRoom: string;
  annotations: any[];
}

export interface ISocketChangeRanking {
  user: ISocketUser;
  oldRanking: any[];
  newRanking: any[];
}

export interface ISocketRoomData {
  requester: ISocketUserInfo;
  recipient: string;
  info: ISocketUserInfo;
}


// Misc
export interface ISizedEvent {
  width: number;
  height: number;
}

export interface IServerResponse {
  message?: string;
  status?: string;
}
