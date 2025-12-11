using {monitoring as db} from '../db/schema';

service ErrorService @(path: '/error-service') {
    entity ErrorLogs as projection on db.ErrorLog;
}
