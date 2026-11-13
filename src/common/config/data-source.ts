import { DataSource, DataSourceOptions } from 'typeorm';
import 'dotenv/config'; // Đọc trực tiếp file .env cho CLI

export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql', // Đổi thành 'mysql' nếu dùng MySQL
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: ['dist/**/*.entity.js'], // Trong môi trường ESM, trỏ vào thư mục compile (dist)
  migrations: ['dist/migrations/*.js'],
  synchronize: false, // Bắt buộc tắt (false) để dùng migration thủ công
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
