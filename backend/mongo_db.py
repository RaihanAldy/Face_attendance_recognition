# mongo_db.py - Dengan methods untuk React
class MongoDBManager:
    # ... previous methods ...
    
    def get_attendance_by_date(self, date_str):
        """Get attendance for specific date untuk React"""
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            start_of_day = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = date_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
        except:
            # Jika date invalid, use today
            start_of_day = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)
        
        pipeline = [
            {
                '$match': {
                    'timestamp': {'$gte': start_of_day, '$lte': end_of_day}
                }
            },
            {
                '$lookup': {
                    'from': 'employees',
                    'localField': 'employee_id',
                    'foreignField': 'employee_id',
                    'as': 'employee'
                }
            },
            {
                '$unwind': '$employee'
            },
            {
                '$project': {
                    '_id': 0,
                    'attendanceId': '$_id',
                    'employeeId': '$employee_id',
                    'name': '$employee.name',
                    'department': '$employee.department',
                    'timestamp': 1,
                    'confidence': 1,
                    'status': 1
                }
            },
            {
                '$sort': {'timestamp': -1}
            }
        ]
        
        results = list(self.attendance.aggregate(pipeline))
        
        # Convert ObjectId dan datetime untuk JSON
        for item in results:
            item['attendanceId'] = str(item['attendanceId'])
            item['timestamp'] = item['timestamp'].isoformat()
        
        return results
    
    def get_last_sync_time(self):
        """Get last sync time"""
        last_sync = self.attendance.find_one(
            {'synced': True},
            sort=[('synced_at', -1)]
        )
        return last_sync['synced_at'].isoformat() if last_sync and 'synced_at' in last_sync else None