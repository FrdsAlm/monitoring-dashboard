using { monitoring as db } from '../db/src/schema';

service ErrorService @(path:'/error-service') {
    entity ErrorLogs as projection on db.ErrorLog;
}
