import { RecordingModel, RecordingStatusModel } from './models/recording';
import { UserModel } from './models/user';

export interface Database {
    user: UserModel;
    recording: RecordingModel;
    recordingStatus: RecordingStatusModel;
}
