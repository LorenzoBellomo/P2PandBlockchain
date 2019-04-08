import java.net.InetAddress;

/**
 * This class models the Node entity, which is represented by an identifier (m
 * bits long), an IP address and a UDP port on which it is listening for
 * messages.
 * 
 * @author Lorenzo Bellomo
 *
 */
public class Node {

	private long identifier;
	private InetAddress ipAddress;
	private int udpPort;

	public Node(long id) {
		ipAddress = InetAddress.getLoopbackAddress();
		identifier = id;
		udpPort = 0;
	}

	public InetAddress getIpAddr() {
		return ipAddress;
	}

	public long getId() {
		return identifier;
	}

	public int getUDPPort() {
		return udpPort;
	}

	public boolean ping() {
		return true;
	}

}
