using {monitoring as db} from '../db/src/schema';

service ErrorService @(path: '/error-service') {
    entity ErrorLogs as projection on db.ErrorLog;
}

// Serve static files from app/webapp
annotate ErrorService with @(UI.StaticResources: [{
    name: 'webapp',
    path: '../app/webapp'
}]);
