namespace monitoring;

entity ErrorLog {
    key ID          : UUID;
        timestamp   : Timestamp;
        level       : String(20);
        message     : LargeString;
        description : LargeString;
        source      : String(200);
        details     : LargeString;
}
