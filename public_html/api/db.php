<?php
class Database {
    // IMPORTANTE: Cambia estos datos por los de tu base de datos en Hostinger
    private $host = "localhost";
    private $db_name = "u612988177_martin_porres"; 
    private $username = "u612988177_admin_5"; 
    private $password = "#c|TY4u!NY6"; 
    public $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            $this->conn = new PDO("mysql:host=" . $this->host . ";dbname=" . $this->db_name, $this->username, $this->password);
            $this->conn->exec("set names utf8");
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch(PDOException $exception) {
            echo json_encode(["error" => "Error de conexión a la base de datos: " . $exception->getMessage()]);
            exit;
        }
        return $this->conn;
    }
}
?>
