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
